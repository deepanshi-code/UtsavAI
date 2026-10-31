import { NextResponse } from "next/server";
import { GeminiBusyError, generateJson } from "@/lib/gemini";
import { normaliseIdeas } from "@/lib/normalise";
import { IDEAS_SCHEMA } from "@/lib/planSchema";
import { buildIdeasPrompt } from "@/lib/prompts";
import { clientIp, createLimiter } from "@/lib/rateLimit";
import { IDEA_CATEGORIES } from "@/lib/types";
import { validateInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

const limited = createLimiter(10);

/** Six more ideas for an existing plan, avoiding the ones it already has. */
export async function POST(req: Request) {
  if (limited(clientIp(req)))
    return NextResponse.json({ error: "Too many requests. Please wait a minute." }, { status: 429 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = validateInput(body.input);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const existing = (Array.isArray(body.existing) ? body.existing : [])
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.slice(0, 80))
    .slice(0, 40);
  const focus = IDEA_CATEGORIES.includes(body.focus as (typeof IDEA_CATEGORIES)[number])
    ? String(body.focus)
    : "";

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "More ideas need a GEMINI_API_KEY." }, { status: 503 });

  try {
    const raw = (await generateJson(
      buildIdeasPrompt(parsed.value, existing, focus),
      IDEAS_SCHEMA,
      apiKey,
      1.0,
    )) as { ideas?: unknown };
    const taken = new Set(existing.map((t) => t.toLowerCase()));
    const ideas = normaliseIdeas(raw?.ideas).filter((i) => !taken.has(i.title.toLowerCase()));
    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("ideas generation failed", err);
    const busy = err instanceof GeminiBusyError;
    return NextResponse.json(
      {
        error: busy
          ? "Gemini is very busy right now. Please try again in a minute."
          : "Couldn't come up with more ideas right now.",
      },
      { status: busy ? 503 : 502 },
    );
  }
}
