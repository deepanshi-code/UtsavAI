import { Type, type Schema } from "@google/genai";
import { NextResponse } from "next/server";
import { GeminiBusyError, generateJson } from "@/lib/gemini";
import {
  buildInvitePrompt,
  cleanOptions,
  defaultInvite,
  normaliseInvite,
  type InviteOccasion,
  type InviteText,
} from "@/lib/invite";
import { clientIp, createLimiter } from "@/lib/rateLimit";
import { validateInput } from "@/lib/validate";

export const runtime = "nodejs";
export const maxDuration = 60;

// "Write all with AI" sends one request per wedding function, so allow a burst of those.
const limited = createLimiter(20);

const INVITE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    headline: {
      type: Type.STRING,
      description: "Short top line, max 6 words, e.g. 'You're Invited' or 'शुभ विवाह'.",
    },
    names: {
      type: Type.STRING,
      description: "Who/what is being celebrated, from the provided name only. Empty if none given.",
    },
    body: {
      type: Type.STRING,
      description: "2-3 sentence invitation, max 45 words, without date, time, venue, RSVP or host names.",
    },
    details: {
      type: Type.STRING,
      description:
        "Optional extra line(s), e.g. the functions of a multi-day event. Empty string if nothing to add.",
    },
    closing: {
      type: Type.STRING,
      description: "One short blessing or sign-off line, without names or RSVP details.",
    },
  },
  required: ["headline", "names", "body", "details", "closing"],
};

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
  const input = parsed.value;
  const options = cleanOptions(body.options);

  // Only the title and schedule titles are used from the plan, re-capped here.
  const p = (body.plan && typeof body.plan === "object" ? body.plan : {}) as Record<string, unknown>;
  const plan = {
    title: typeof p.title === "string" ? p.title.slice(0, 100) : "",
    schedule: (Array.isArray(p.schedule) ? p.schedule : [])
      .slice(0, 30)
      .map((s: Record<string, unknown>) => ({
        day: Number(s?.day) || 1,
        title: String(s?.title ?? "").slice(0, 60),
        time: "",
        details: "",
      })),
  };

  // Optional: the one function this card is for.
  const o = (body.occasion && typeof body.occasion === "object" ? body.occasion : null) as Record<
    string,
    unknown
  > | null;
  const occasion: InviteOccasion | undefined =
    o && typeof o.title === "string" && o.title.trim()
      ? {
          key: String(o.key ?? "fn").slice(0, 80),
          title: o.title.trim().slice(0, 60),
          day: Math.min(7, Math.max(1, Math.round(Number(o.day)) || 1)),
          time: typeof o.time === "string" ? o.time.slice(0, 20) : "",
          guests: Math.min(10000, Math.max(0, Math.round(Number(o.guests)) || 0)) || undefined,
          theme: typeof o.theme === "string" ? o.theme.slice(0, 80) : "",
        }
      : undefined;

  const fallback = defaultInvite(input, plan, occasion);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    return NextResponse.json<{ invite: InviteText; source: string }>({
      invite: fallback,
      source: "template",
    });

  try {
    const raw = await generateJson(
      buildInvitePrompt(input, plan, options, occasion),
      INVITE_SCHEMA,
      apiKey,
      0.9,
    );
    return NextResponse.json({ invite: normaliseInvite(raw, fallback), source: "gemini" });
  } catch (err) {
    console.error("invite generation failed", err);
    const msg =
      err instanceof GeminiBusyError
        ? "Gemini is very busy right now. Please try again in a minute."
        : "Couldn't write the invitation right now.";
    return NextResponse.json({ error: msg }, { status: err instanceof GeminiBusyError ? 503 : 502 });
  }
}
