import type { EventPlan, PlanInput, PlanResponse } from "./types";

/** Calls the plan API. Throws an Error with a user-facing message on failure. */
export async function requestPlan(
  input: PlanInput,
  refine?: { instruction: string; previous: EventPlan },
): Promise<PlanResponse> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, refine: refine?.instruction, previous: refine?.previous }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as PlanResponse;
}
