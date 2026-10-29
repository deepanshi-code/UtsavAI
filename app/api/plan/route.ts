import { NextResponse } from "next/server";
import { GeminiBusyError, generatePlan, normalisePlan } from "@/lib/gemini";
import { samplePlan } from "@/lib/sample";
import type { EventPlan, PlanResponse } from "@/lib/types";
import { LIMITS, validateInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

// Best-effort per-instance rate limit. Serverless instances don't share memory,
// so this only blunts bursts; a shared store (e.g. Upstash) would be needed for a hard cap.
const hits = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = validateInput(body.input);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const input = parsed.value;

  const instruction = typeof body.refine === "string" ? body.refine.trim().slice(0, LIMITS.refineText) : "";
  // The previous plan comes from the client, so re-normalise it (strips unknown
  // fields, caps string lengths) before it goes back into the prompt.
  let refine: { instruction: string; previous: EventPlan } | undefined;
  if (instruction && body.previous && typeof body.previous === "object") {
    if (JSON.stringify(body.previous).length > 30_000) {
      return NextResponse.json({ error: "Plan is too large to refine." }, { status: 413 });
    }
    refine = { instruction, previous: normalisePlan(body.previous, input) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json<PlanResponse>({ plan: samplePlan(input), budget: input.budget, source: "sample" });
  }

  try {
    const { plan, budget } = await generatePlan(input, apiKey, refine);
    return NextResponse.json<PlanResponse>({ plan, budget, source: "gemini" });
  } catch (err) {
    console.error("plan generation failed", err);
    if (err instanceof GeminiBusyError) {
      return NextResponse.json(
        { error: "Gemini is very busy right now. Please try again in a minute." },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "The planner couldn't generate a plan right now. Please try again." },
      { status: 502 },
    );
  }
}
