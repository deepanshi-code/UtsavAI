export const EVENT_TYPES = ["wedding", "birthday", "community", "festival", "corporate", "other"] as const;
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
  /** How many consecutive days the celebration runs, starting on `date` (1–7). */
  days?: number;
  /** Functions the host wants planned individually (Haldi, Sangeet…). Empty = let the planner decide. */
  functions?: FunctionInput[];
  /** Hotel rooms for outstation guests, if the host wants them planned. */
  stay?: StayInput;
}

export interface FunctionInput {
  name: string;
  day: number; // 1-based
  guests: number;
  theme: string;
}

export const STAY_TIERS = ["budget", "mid", "luxury"] as const;
export interface StayInput {
  rooms: number;
  nights: number;
  tier: (typeof STAY_TIERS)[number];
}

/**
 * One function / slot on a given day, e.g. Day 1 · 11:00 AM · Haldi. The optional
 * fields are the per-function plan; minor slots (a lunch) may leave them empty.
 */
export interface ScheduleItem {
  day: number; // 1-based
  time: string; // free text, e.g. "7:00 PM"
  title: string;
  details: string;
  guests?: number;
  theme?: string;
  decor?: string;
  food?: string;
  music?: string;
  attire?: string;
}

/** Hotel plan for outstation guests. */
export interface StayPlan {
  summary: string;
  where: string; // which area to book in and why
  costEstimate: string;
  tips: string[];
  searchQuery: string; // map search without the city, e.g. "4 star hotel"
}

/** A real business picked from Google Places (never produced by the model). */
export interface VendorPick {
  name: string;
  phone?: string;
  address?: string;
  rating?: number;
  mapsUrl?: string;
  website?: string;
}

/** A kind of venue that suits the event. Deliberately not a named venue: names come from the live map. */
export interface VenueType {
  type: string; // "Banquet hall"
  why: string;
  capacity: string; // "150–300 guests"
  priceRange: string; // "₹800–1,500 per plate"
  searchQuery: string; // Maps search, without the city: "banquet hall"
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
  shortlist?: VendorPick[]; // client-side only: real businesses the host saved
}

export const IDEA_CATEGORIES = [
  "Decor",
  "Entertainment",
  "Food & drinks",
  "Guest experience",
  "Photos & social",
  "Tradition, reimagined",
] as const;

export interface Idea {
  title: string;
  description: string;
  category: string;
}

export interface Custom {
  name: string;
  description: string;
}

/** The structured plan Gemini returns (after server-side normalisation). */
export interface EventPlan {
  title: string;
  summary: string;
  /** A short personal note from "your planner", written in first person plural. */
  plannerNote: string;
  stay: StayPlan | null;
  schedule: ScheduleItem[];
  venueTypes: VenueType[];
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
