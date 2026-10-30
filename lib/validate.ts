import { EVENT_TYPES, STAY_TIERS, type EventType, type FunctionInput, type PlanInput, type StayInput } from "./types";

export const LIMITS = {
  minBudget: 1_000,
  maxBudget: 50_00_00_000, // ₹50 crore
  maxGuests: 10_000,
  shortText: 80,
  styleText: 240, // several style chips joined
  longText: 900, // preference chips plus free text
  refineText: 400,
  maxFunctions: 12,
};

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Validates untrusted request input. Text is length-capped rather than rejected
 * so a long paste doesn't fail the whole request; numbers and dates must be valid.
 */
export function validateInput(raw: unknown): Result<PlanInput> {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Missing event details." };
  const r = raw as Record<string, unknown>;

  const eventType = r.eventType as EventType;
  if (!EVENT_TYPES.includes(eventType)) return { ok: false, error: "Unknown event type." };

  const budget = Number(r.budget);
  if (!Number.isFinite(budget) || budget < LIMITS.minBudget || budget > LIMITS.maxBudget) {
    return { ok: false, error: `Budget must be between ₹${LIMITS.minBudget} and ₹50 crore.` };
  }

  const guests = Number(r.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > LIMITS.maxGuests) {
    return { ok: false, error: `Guests must be a whole number from 1 to ${LIMITS.maxGuests}.` };
  }

  const date = str(r.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { ok: false, error: "Event date must be a valid date." };
  }

  const city = str(r.city, LIMITS.shortText);
  if (!city) return { ok: false, error: "Please enter a city." };

  const days = r.days === undefined ? 1 : Number(r.days);
  if (!Number.isInteger(days) || days < 1 || days > 7) {
    return { ok: false, error: "The celebration can run from 1 to 7 days." };
  }

  return {
    ok: true,
    value: {
      eventType,
      title: str(r.title, LIMITS.shortText),
      date,
      city,
      guests,
      budget: Math.round(budget),
      style: str(r.style, LIMITS.styleText),
      preferences: str(r.preferences, LIMITS.longText),
      milestone: str(r.milestone, LIMITS.shortText),
      days,
      functions: cleanFunctions(r.functions, days, guests),
      stay: cleanStay(r.stay, days),
    },
  };
}

const clamp = (n: unknown, lo: number, hi: number, fallback: number) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
};

/** Functions the host listed: unnamed rows are dropped, days and guests clamped. */
export function cleanFunctions(raw: unknown, days: number, guests: number): FunctionInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      name: str(x.name, 40),
      day: clamp(x.day, 1, days, 1),
      guests: clamp(x.guests, 1, LIMITS.maxGuests, guests),
      theme: str(x.theme, LIMITS.shortText),
    }))
    .filter((x) => x.name)
    .slice(0, LIMITS.maxFunctions);
}

/** Hotel stay request; anything malformed means "no stay planned". */
export function cleanStay(raw: unknown, days: number): StayInput | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const rooms = clamp(r.rooms, 0, 500, 0);
  if (rooms < 1) return undefined;
  return {
    rooms,
    nights: clamp(r.nights, 1, 10, days),
    tier: STAY_TIERS.includes(r.tier as StayInput["tier"]) ? (r.tier as StayInput["tier"]) : "mid",
  };
}
