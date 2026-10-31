import { GoogleGenAI, ThinkingLevel, type Schema } from "@google/genai";
import { normalisePlan, resolveTotal } from "./normalise";
import { PLAN_SCHEMA } from "./planSchema";
import { buildPrompt } from "./prompts";
import type { EventPlan, PlanInput } from "./types";

/* The Gemini client: a chain of models with hedged requests inside Vercel's time limit. */

/**
 * Models tried in order (exact versions, not "-latest" aliases, so behaviour doesn't
 * change underneath us). Which Flash model is overloaded shifts during the day, so
 * the chain spans four; requests are hedged across them (see generateJson).
 * Override with GEMINI_MODELS="a,b".
 */
export function modelChain(env: Record<string, string | undefined> = process.env): string[] {
  const list = (
    env.GEMINI_MODELS ||
    env.GEMINI_MODEL ||
    "gemini-3.6-flash,gemini-3.5-flash,gemini-3.5-flash-lite,gemini-3.1-flash-lite"
  )
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set(list)];
}

// Vercel cuts the function off at 60s (route maxDuration); leave headroom to respond.
const TOTAL_BUDGET_MS = 52_000;
const ATTEMPT_CAP_MS = 38_000; // so one hung request still leaves time for another try
const MIN_ATTEMPT_MS = 8_000; // a full plan rarely comes back faster than this
const HEDGE_MS = 12_000; // if a model hasn't answered by now, start the next one alongside it
const MAX_IN_FLIGHT = 2; // at most two models working on one request at a time

/** Thrown when every attempt failed because Gemini was overloaded or slow, not because of our request. */
export class GeminiBusyError extends Error {}

/** Overload, rate-limit and timeout errors are worth retrying; a 400 (bad request) is not. */
export function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status) return status === 429 || status >= 500;
  return /timeout|timed out|abort|fetch failed|ECONNRESET/i.test(String((err as Error)?.message ?? err));
}

export async function generatePlan(
  input: PlanInput,
  apiKey: string,
  refine?: { instruction: string; previous: EventPlan },
): Promise<{ plan: EventPlan; budget: number }> {
  const raw = await generateJson(buildPrompt(input, refine), PLAN_SCHEMA, apiKey);
  const budget = resolveTotal(raw, input, !!refine);
  return { plan: normalisePlan(raw, { ...input, budget }), budget };
}

/** One attempt against one model; resolves with the parsed JSON. */
async function callModel(
  model: string,
  contents: string,
  schema: Schema,
  apiKey: string,
  temperature: number,
  timeout: number,
  signal: AbortSignal,
): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout } });
  const res = await ai.models.generateContent({
    model,
    contents,
    config: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature,
      // Schema-shaped output doesn't need long reasoning, and thinking time was the
      // difference between ~15s and timing out.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      abortSignal: signal,
    },
  });
  const text = res.text;
  if (!text) throw new Error("Empty response from Gemini");
  return JSON.parse(text);
}

/**
 * One structured-output request, made resilient to Gemini overload:
 * - a failed attempt is replaced straight away by the next model in the chain
 *   (with a short pause only after a whole round has failed);
 * - a *slow* attempt is hedged: after HEDGE_MS the next model starts in parallel,
 *   and whichever valid answer arrives first wins (the other is cancelled);
 * - everything stops at the overall time budget, inside Vercel's 60s limit.
 * Returns the parsed JSON; callers must still validate it.
 */
export async function generateJson(
  contents: string,
  schema: Schema,
  apiKey: string,
  temperature = 0.7,
): Promise<unknown> {
  const models = modelChain();
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const controllers: AbortController[] = [];
  let lastError: unknown;
  let allTransient = true;
  let next = 0;
  let inFlight = 0;
  let failures = 0;

  return new Promise<unknown>((resolve, reject) => {
    let settled = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (done: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(hedgeTimer);
      clearTimeout(budgetTimer);
      controllers.forEach((c) => c.abort());
      done();
    };
    const fail = () =>
      finish(() =>
        reject(
          allTransient
            ? new GeminiBusyError(`Gemini busy: ${String(lastError ?? "timed out").slice(0, 200)}`)
            : lastError,
        ),
      );
    const budgetTimer = setTimeout(fail, TOTAL_BUDGET_MS);

    const launch = () => {
      if (settled || inFlight >= MAX_IN_FLIGHT) return;
      const remaining = deadline - Date.now();
      if (models.length === 0 || remaining < MIN_ATTEMPT_MS) {
        if (inFlight === 0) fail();
        return;
      }
      const model = models[next++ % models.length];
      const ctrl = new AbortController();
      controllers.push(ctrl);
      inFlight++;
      callModel(
        model,
        contents,
        schema,
        apiKey,
        temperature,
        Math.min(ATTEMPT_CAP_MS, remaining),
        ctrl.signal,
      ).then(
        (data) => finish(() => resolve(data)),
        (err) => {
          inFlight--;
          if (settled) return;
          lastError = err;
          failures++;
          if (!isTransient(err)) allTransient = false;
          console.warn(`gemini attempt (${model}) failed:`, String(err).slice(0, 200));
          // A 4xx such as "model not found" won't fix itself; stop asking that model.
          const status = (err as { status?: number })?.status;
          if (status && !isTransient(err)) {
            const at = models.indexOf(model);
            if (at >= 0) models.splice(at, 1);
          }
          // Replace the failed attempt; pause briefly only after a whole round of failures.
          const pause =
            models.length && failures % models.length === 0
              ? Math.min(1500, Math.max(0, deadline - Date.now() - MIN_ATTEMPT_MS))
              : 0;
          setTimeout(launch, pause);
        },
      );
      // Hedge: if this attempt is slow, bring in the next model alongside it.
      clearTimeout(hedgeTimer);
      hedgeTimer = setTimeout(launch, HEDGE_MS);
    };

    launch();
  });
}
