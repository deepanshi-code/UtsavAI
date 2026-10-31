import { distribute } from "./budget";
import { daysUntil } from "./format";
import { IDEA_CATEGORIES, type EventPlan, type Idea, type PlanInput } from "./types";
import { LIMITS } from "./validate";

/* Model output is validated, not trusted: everything Gemini returns passes through here. */

/**
 * The total the plan should add up to. Normally the user's own figure; on a refine
 * that changes the budget ("cut it by 20%") the model's new total is used, as long
 * as it's within the allowed range.
 */
export function resolveTotal(raw: unknown, input: PlanInput, refining: boolean): number {
  if (!refining) return input.budget;
  const t = Math.round(Number((raw as { totalBudget?: unknown })?.totalBudget));
  return Number.isFinite(t) && t >= LIMITS.minBudget && t <= LIMITS.maxBudget ? t : input.budget;
}

export const eventDays = (input: Pick<PlanInput, "days">) => clampInt(input.days ?? 1, 1, 7);

function clampInt(n: unknown, lo: number, hi: number): number {
  const v = Math.round(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}

const s = (v: unknown, max = 400) => (typeof v === "string" ? v.slice(0, max) : "");

/** Map searches are built from model text, so keep them to plain words. */
const cleanQuery = (v: unknown) =>
  s(v, 60)
    .replace(/[^\p{L}\p{N} &'-]/gu, "")
    .trim();

export function normaliseIdeas(raw: unknown): Idea[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => ({
      title: s(i.title, 80),
      description: s(i.description, 400),
      category: IDEA_CATEGORIES.includes(i.category as (typeof IDEA_CATEGORIES)[number])
        ? String(i.category)
        : "Guest experience",
    }))
    .filter((i) => i.title)
    .slice(0, 16);
}

/**
 * Model output is checked, not trusted: drops malformed rows, clamps timeline days
 * to the time actually available, and rescales budget lines so they sum to exactly
 * the user's total (LLMs are unreliable at arithmetic).
 */
export function normalisePlan(raw: unknown, input: PlanInput): EventPlan {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const arr = (v: unknown) =>
    (Array.isArray(v) ? (v as Record<string, unknown>[]) : []).filter((x) => x && typeof x === "object");
  const maxDays = Math.max(0, daysUntil(input.date));

  const budgetRows = arr(r.budget)
    .map((b) => ({
      category: s(b.category, 60),
      amount: Math.max(0, Number(b.amount) || 0),
      notes: s(b.notes),
    }))
    .filter((b) => b.category);
  const amounts = distribute(
    input.budget,
    budgetRows.map((b) => b.amount),
  );
  const budget = budgetRows.map((b, i) => ({ ...b, amount: amounts[i] }));

  const timeline = arr(r.timeline)
    .map((t) => ({
      daysBefore: clampInt(t.daysBefore, 0, maxDays),
      task: s(t.task, 200),
      owner: s(t.owner, 40) || "Host",
    }))
    .filter((t) => t.task)
    .sort((a, b) => b.daysBefore - a.daysBefore);

  // Stable sort by day keeps the model's within-day order (which follows its times).
  const schedule = arr(r.schedule)
    .map((x) => ({
      day: clampInt(x.day, 1, eventDays(input)),
      time: s(x.time, 20),
      title: s(x.title, 80),
      details: s(x.details, 300),
      guests: clampInt(x.guests, 0, LIMITS.maxGuests) || undefined,
      theme: s(x.theme, 120),
      decor: s(x.decor, 200),
      food: s(x.food, 200),
      music: s(x.music, 200),
      attire: s(x.attire, 160),
    }))
    .filter((x) => x.title)
    .sort((a, b) => a.day - b.day);

  const st = r.stay && typeof r.stay === "object" ? (r.stay as Record<string, unknown>) : null;
  // Only keep a stay plan when the host asked for one.
  const stay =
    input.stay && st && s(st.summary)
      ? {
          summary: s(st.summary, 400),
          where: s(st.where, 300),
          costEstimate: s(st.costEstimate, 160),
          tips: (Array.isArray(st.tips) ? st.tips : [])
            .map((t) => s(t, 200))
            .filter(Boolean)
            .slice(0, 5),
          searchQuery: cleanQuery(st.searchQuery) || "hotel",
        }
      : null;

  const venueTypes = arr(r.venueTypes)
    .map((v) => ({
      type: s(v.type, 60),
      why: s(v.why, 300),
      capacity: s(v.capacity, 60),
      priceRange: s(v.priceRange, 80),
      searchQuery: cleanQuery(v.searchQuery) || s(v.type, 60),
    }))
    .filter((v) => v.type)
    .slice(0, 6);

  return {
    title: s(r.title, 100) || input.title || `Your ${input.eventType}`,
    summary: s(r.summary, 600),
    plannerNote: s(r.plannerNote, 700),
    stay,
    schedule,
    venueTypes,
    budget,
    timeline,
    vendors: arr(r.vendors)
      .map((v) => ({
        category: s(v.category, 60),
        questions: s(v.questions),
        priority: v.priority === "nice" ? ("nice" as const) : ("must" as const),
      }))
      .filter((v) => v.category),
    ideas: normaliseIdeas(r.ideas),
    customs: arr(r.customs)
      .map((c) => ({ name: s(c.name, 80), description: s(c.description) }))
      .filter((c) => c.name),
    risks: (Array.isArray(r.risks) ? r.risks : []).map((x) => s(x, 300)).filter(Boolean),
  };
}
