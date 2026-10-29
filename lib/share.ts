import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import type { EventPlan, PlanInput } from "./types";

export interface SharedState {
  input: PlanInput;
  plan: EventPlan;
}

/**
 * Encodes the plan into the URL fragment (#p=...). Fragments are never sent to the
 * server, so shared plans need no database and aren't logged by the host.
 */
export function encodeShare(state: SharedState): string {
  return compressToEncodedURIComponent(JSON.stringify(state));
}

export function decodeShare(fragment: string): SharedState | null {
  try {
    const json = decompressFromEncodedURIComponent(fragment);
    if (!json) return null;
    const v = JSON.parse(json);
    if (!v?.input || !v?.plan || !Array.isArray(v.plan.budget)) return null;
    return v as SharedState;
  } catch {
    return null;
  }
}
