import { normalisePlan } from "./gemini";
import type { EventPlan, PlanInput } from "./types";

/**
 * Fixed plan used only when no GEMINI_API_KEY is configured, so the UI can be
 * run and tested locally. The UI labels it clearly as a sample.
 */
export function samplePlan(input: PlanInput): EventPlan {
  return normalisePlan(
    {
      title: input.title || `Sample ${input.eventType} plan`,
      summary: `This is a fixed sample plan for ${input.guests} guests in ${input.city}. Add a GEMINI_API_KEY to get a plan generated for your actual event.`,
      schedule: [
        { day: 1, time: "6:00 PM", title: "Guests arrive", details: "Welcome drinks and seating." },
        { day: 1, time: "7:30 PM", title: "Main celebration", details: "Ceremony or programme." },
        { day: 1, time: "9:00 PM", title: "Dinner", details: "Buffet service." },
      ],
      venueTypes: [
        { type: "Banquet hall", why: "Indoor, weather-proof, catering often included.", capacity: "100-400 guests", priceRange: "Varies by city", searchQuery: "banquet hall" },
        { type: "Lawn / garden venue", why: "Open-air and spacious for larger groups.", capacity: "200-800 guests", priceRange: "Varies by city", searchQuery: "wedding lawn" },
      ],
      budget: [
        { category: "Venue", amount: 30, notes: "Compare weekday vs weekend rates." },
        { category: "Catering", amount: 35, notes: "Per-plate pricing; confirm final headcount 3 days before." },
        { category: "Decor", amount: 12, notes: "Reuse ceremony decor for the reception." },
        { category: "Photography", amount: 10, notes: "Book a half-day package if possible." },
        { category: "Entertainment", amount: 6, notes: "Local DJ or live band." },
        { category: "Contingency", amount: 7, notes: "Keep ~7% unallocated for surprises." },
      ],
      timeline: [
        { daysBefore: 60, task: "Fix guest list and book venue", owner: "Host" },
        { daysBefore: 45, task: "Shortlist and book caterer after a tasting", owner: "Host" },
        { daysBefore: 30, task: "Send invitations", owner: "Family" },
        { daysBefore: 14, task: "Confirm decor plan and photographer shot list", owner: "Host" },
        { daysBefore: 3, task: "Share final headcount with caterer", owner: "Host" },
        { daysBefore: 0, task: "Event day: vendor coordination and setup check", owner: "Planner" },
      ],
      vendors: [
        { category: "Venue", questions: "Capacity, parking, sound curfew, cancellation policy?", priority: "must" },
        { category: "Caterer", questions: "Tasting available? Veg/Jain options? Per-plate vs buffet?", priority: "must" },
        { category: "Photographer", questions: "Delivery timeline and number of edited photos?", priority: "must" },
        { category: "Decorator", questions: "What is included in the quote? Setup/teardown times?", priority: "nice" },
      ],
      ideas: [
        { title: "Welcome station", description: "Local snacks and a hand-written welcome board at the entry." },
        { title: "Memory wall", description: "Guests pin photos and notes; doubles as a backdrop." },
      ],
      customs: [],
      risks: ["Sample data only: numbers are not tailored to your event."],
    },
    input,
  );
}
