import type { EventPlan } from "./types";

const key = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * A refine returns a fresh plan from the model, which knows nothing about what the
 * user has ticked off. Keep "done" on tasks and vendors that survive unchanged
 * (matched by task text / vendor category) so progress isn't wiped.
 */
export function carryProgress(prev: EventPlan, next: EventPlan): EventPlan {
  const doneTasks = new Set(prev.timeline.filter((t) => t.done).map((t) => key(t.task)));
  const oldVendors = new Map(prev.vendors.map((v) => [key(v.category), v]));
  return {
    ...next,
    timeline: next.timeline.map((t) => (doneTasks.has(key(t.task)) ? { ...t, done: true } : t)),
    // Ticks and the real businesses the family shortlisted both survive.
    vendors: next.vendors.map((v) => {
      const old = oldVendors.get(key(v.category));
      return old ? { ...v, done: old.done, shortlist: old.shortlist } : v;
    }),
  };
}
