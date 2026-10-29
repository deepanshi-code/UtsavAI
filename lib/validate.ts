import { EVENT_TYPES, type EventType, type PlanInput } from "./types";

export const LIMITS = {
  minBudget: 1_000,
  maxBudget: 50_00_00_000, // ₹50 crore
  maxGuests: 10_000,
  shortText: 80,
  longText: 500,
  refineText: 300,
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

  return {
    ok: true,
    value: {
      eventType,
      title: str(r.title, LIMITS.shortText),
      date,
      city,
      guests,
      budget: Math.round(budget),
      style: str(r.style, LIMITS.shortText),
      preferences: str(r.preferences, LIMITS.longText),
      milestone: str(r.milestone, LIMITS.shortText),
    },
  };
}
