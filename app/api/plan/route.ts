import { NextResponse } from "next/server";
import { GeminiBusyError, generatePlan } from "@/lib/gemini";
import { normalisePlan } from "@/lib/normalise";
import { clientIp, createLimiter } from "@/lib/rateLimit";
import { samplePlan } from "@/lib/sample";
import type { EventPlan, PlanResponse } from "@/lib/types";
import { LIMITS, validateInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const rateLimited = createLimiter(8);

export async function POST(req: Request) {
  if (rateLimited(clientIp(req))) {
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
    return NextResponse.json<PlanResponse>({
      plan: samplePlan(input),
      budget: input.budget,
      source: "sample",
    });
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
