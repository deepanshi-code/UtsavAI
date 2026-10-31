import type { EventType } from "./types";

/**
 * Hand-written planning tips shown while a plan is being generated. Kept as
 * general, well-established advice (no prices, no claims about specific places).
 */
const BY_TYPE: Record<EventType, string[]> = {
  wedding: [
    "Popular wedding dates book out early. Shortlist two backup dates before you approach venues.",
    "Ask every venue for its decor and outside-caterer policy before you sign; it can change your whole budget.",
    "Schedule the Mehendi at least a day before the wedding so the colour has time to deepen.",
    "Build a 30–45 minute buffer between back-to-back functions. Outfit changes always take longer than planned.",
    "Share a single shared spreadsheet or WhatsApp group with both families for RSVPs; it saves dozens of calls.",
    "Brief your photographer on the people who must be in photos. Make a written list of family groupings.",
  ],
  birthday: [
    "Send invitations two to three weeks ahead for weekends; a week is often enough for weekdays.",
    "For kids' parties, plan activities in 15–20 minute blocks; attention spans are short.",
    "Order the cake with a written message and a delivery time at least an hour before guests arrive.",
    "A simple theme carried through invites, decor and the cake looks more polished than lots of props.",
    "Keep a quiet corner for younger guests or anyone who needs a break from the noise.",
  ],
  community: [
    "Check with your society or local authority about permissions for loudspeakers and public spaces early.",
    "Assign one volunteer lead per area: food, stage, registration and clean-up.",
    "Plan for waste segregation bins; it makes clean-up much faster after a large gathering.",
    "Share a run-of-show with performers so everyone knows their slot and the sound check timing.",
    "Keep a small first-aid kit and a lost-and-found point near the entrance.",
  ],
  festival: [
    "Order idols, flowers and puja samagri early; demand peaks in the days just before the festival.",
    "If you're hosting at home, brief neighbours about parking and timings in advance.",
    "Eco-friendly decor (clay, fabric, flowers) is easy to source and simple to dispose of responsibly.",
    "Plan prasad and food quantities for a few more guests than expected; festivals draw drop-ins.",
    "Keep a printed aarti or bhajan sheet handy so everyone can join in.",
  ],
  corporate: [
    "Confirm the AV setup (mics, projector, adaptors) with a run-through the day before.",
    "Ask attendees about dietary needs in the RSVP form so catering numbers are right.",
    "Short, varied segments keep energy up better than long speeches.",
    "Have a clear contact person on the day for vendors, so decisions don't wait on meetings.",
  ],
  other: [
    "Write down the three things that matter most to you about the day; let them guide every trade-off.",
    "Confirm every vendor booking in writing, including arrival time and what's included.",
    "Keep a small emergency kit: safety pins, tape, chargers, scissors and a sewing kit.",
    "Ask one trusted friend to be the go-to person on the day, so you can actually enjoy it.",
  ],
};

const GENERAL = [
  "Keep 5–10% of the budget aside for surprises. Something always comes up.",
  "Get every quote itemised; 'all-inclusive' rarely is.",
  "Pay advances by traceable methods and keep receipts in one folder.",
  "Plan the guest list first. Almost every other cost scales with it.",
  "Check the weather pattern for your dates and keep an indoor or covered backup.",
];

/** Tips for an occasion, in a stable but varied order (seeded by the plan's date). */
export function tipsFor(type: EventType, seed: string): string[] {
  const list = [...BY_TYPE[type], ...GENERAL];
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list
    .map((t, i) => ({ t, k: (h ^ (i * 2654435761)) >>> 0 }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.t);
}
