export const EVENT_TYPES = [
  "wedding",
  "birthday",
  "community",
  "festival",
  "corporate",
  "other",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** What the user tells us about their event. */
export interface PlanInput {
  eventType: EventType;
  title: string;
  date: string; // YYYY-MM-DD
  city: string;
  guests: number;
  budget: number; // INR
  style: string;
  preferences: string;
  /** Optional age or milestone ("5th birthday", "25th anniversary"); never guessed by the model. */
  milestone?: string;
}

export interface BudgetItem {
  category: string;
  amount: number; // INR, integer
  notes: string;
  locked?: boolean; // client-side only: excluded from rebalancing
}

export interface TimelineTask {
  daysBefore: number; // 0 = event day
  task: string;
  owner: string;
  done?: boolean; // client-side only
}

export interface VendorItem {
  category: string;
  questions: string; // what to ask / check before booking
  priority: "must" | "nice";
  done?: boolean; // client-side only
}

export interface Idea {
  title: string;
  description: string;
}

export interface Custom {
  name: string;
  description: string;
}

/** The structured plan Gemini returns (after server-side normalisation). */
export interface EventPlan {
  title: string;
  summary: string;
  budget: BudgetItem[];
  timeline: TimelineTask[];
  vendors: VendorItem[];
  ideas: Idea[];
  customs: Custom[];
  risks: string[];
}

export interface PlanResponse {
  plan: EventPlan;
  /** Total the plan adds up to; differs from the request only when a refine changed it. */
  budget: number;
  source: "gemini" | "sample";
}
