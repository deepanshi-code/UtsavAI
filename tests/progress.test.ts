import { describe, expect, it } from "vitest";
import { carryProgress } from "@/lib/progress";
import type { EventPlan } from "@/lib/types";

const plan = (tasks: [string, boolean?][], vendors: [string, boolean?][]): EventPlan => ({
  title: "",
  summary: "",
  plannerNote: "",
  stay: null,
  schedule: [],
  venueTypes: [],
  budget: [],
  ideas: [],
  customs: [],
  risks: [],
  timeline: tasks.map(([task, done]) => ({ task, done, daysBefore: 1, owner: "Host" })),
  vendors: vendors.map(([category, done]) => ({ category, done, questions: "", priority: "must" as const })),
});

describe("carryProgress", () => {
  it("keeps ticks on tasks and vendors that survive a refine", () => {
    const prev = plan([["Book venue", true], ["Send invites", false]], [["Caterer", true], ["DJ", false]]);
    const next = plan([["Book venue"], ["Order cake"]], [["caterer "], ["Florist"]]);
    const out = carryProgress(prev, next);
    expect(out.timeline.map((t) => !!t.done)).toEqual([true, false]);
    expect(out.vendors.map((v) => !!v.done)).toEqual([true, false]);
  });

  it("doesn't tick anything new", () => {
    const out = carryProgress(plan([["A", false]], []), plan([["A"], ["B"]], []));
    expect(out.timeline.every((t) => !t.done)).toBe(true);
  });
});
