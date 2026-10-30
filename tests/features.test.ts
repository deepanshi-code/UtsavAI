import { describe, expect, it } from "vitest";
import { addDays, formatDateRange } from "@/lib/format";
import { buildPrompt, normalisePlan } from "@/lib/gemini";
import { buildIcs } from "@/lib/ics";
import { buildInvitePrompt, cleanOptions, composeMessage, defaultInvite, inviteFacts, normaliseInvite } from "@/lib/invite";
import type { PlanInput } from "@/lib/types";
import { validateInput } from "@/lib/validate";

function inDays(n: number): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + n)).toISOString().slice(0, 10);
}

const input: PlanInput = {
  eventType: "wedding",
  title: "Riya & Arjun",
  date: inDays(60),
  city: "Jaipur",
  guests: 200,
  budget: 1_000_000,
  style: "",
  preferences: "",
  days: 3,
};

describe("multi-day events", () => {
  it("validates the number of days", () => {
    expect(validateInput({ ...input, days: 3 }).ok).toBe(true);
    expect(validateInput({ ...input, days: undefined }).ok && (validateInput({ ...input, days: undefined }) as { value: PlanInput }).value.days).toBe(1);
    expect(validateInput({ ...input, days: 9 }).ok).toBe(false);
    expect(validateInput({ ...input, days: 1.5 }).ok).toBe(false);
  });

  it("tells the model how long the celebration runs", () => {
    expect(buildPrompt(input)).toContain("Duration: 3 days");
  });

  it("clamps schedule days into the celebration and sorts them", () => {
    const plan = normalisePlan(
      { schedule: [{ day: 9, time: "7 PM", title: "Reception", details: "" }, { day: 0, time: "11 AM", title: "Haldi", details: "" }, { day: 2, time: "", title: "", details: "dropped: no title" }] },
      input,
    );
    expect(plan.schedule.map((s) => [s.day, s.title])).toEqual([[1, "Haldi"], [3, "Reception"]]);
  });

  it("formats date ranges", () => {
    expect(addDays("2027-01-31", 1)).toBe("2027-02-01");
    expect(formatDateRange("2027-02-12", 3)).toBe("12–14 Feb 2027");
    expect(formatDateRange("2027-01-31", 2)).toBe("31 Jan–1 Feb 2027");
  });

  it("puts each scheduled function on the right calendar day", () => {
    const ics = buildIcs("Wedding", "2027-02-12", [], new Date("2026-10-30T00:00:00Z"), [
      { day: 1, time: "11 AM", title: "Haldi", details: "" },
      { day: 3, time: "7 PM", title: "Reception", details: "" },
    ]);
    expect(ics).toContain("DTSTART;VALUE=DATE:20270212");
    expect(ics).toContain("DTSTART;VALUE=DATE:20270214");
    expect(ics).toContain("SUMMARY:Reception · 7 PM");
  });
});

describe("venue types", () => {
  it("keeps map searches to plain words (no injected URLs or symbols)", () => {
    const plan = normalisePlan(
      { venueTypes: [{ type: "Banquet hall", why: "", capacity: "", priceRange: "", searchQuery: "banquet hall<script>&q=http://x" }, { type: "Lawn", why: "", capacity: "", priceRange: "", searchQuery: "" }] },
      input,
    );
    expect(plan.venueTypes[0].searchQuery).not.toMatch(/[<>:/=]/);
    expect(plan.venueTypes[1].searchQuery).toBe("Lawn"); // falls back to the type
  });

  it("asks the model for venue kinds, never named venues", () => {
    expect(buildPrompt(input)).toMatch(/Never name a specific\s+venue/);
  });
});

describe("invitations", () => {
  const plan = { title: "Riya & Arjun's wedding", schedule: [] };

  it("falls back to safe defaults for unknown options", () => {
    const o = cleanOptions({ tone: "Sarcastic", language: "Klingon", venue: "x".repeat(500) });
    expect(o.tone).toBe("Warm");
    expect(o.language).toBe("English");
    expect(o.venue.length).toBe(140);
  });

  it("forbids invented details, fences the facts, and keeps form facts out of the AI text", () => {
    const p = buildInvitePrompt(input, plan, cleanOptions({ language: "Hindi", venue: "Rambagh", rsvp: "Riya 98xx" }));
    expect(p).toMatch(/Never invent names, places, times, phone numbers/);
    expect(p).toMatch(/<facts>[\s\S]*Dates:[\s\S]*<\/facts>/);
    expect(p).toMatch(/Do not repeat any of them/);
    // Venue and RSVP are drawn from the form, so the model never sees (or can garble) them.
    expect(p).not.toContain("Rambagh");
    expect(p).not.toContain("98xx");
    expect(p).toContain("Devanagari");
  });

  it("takes the card's facts straight from the form, with a venue fallback", () => {
    expect(inviteFacts(input, cleanOptions({})).venue).toBe("Jaipur · venue details to follow");
    const f = inviteFacts(input, cleanOptions({ venue: " Rambagh Gardens ", time: "7 PM", rsvp: "Riya", hosts: "The Sharmas" }));
    expect(f).toMatchObject({ venue: "Rambagh Gardens", time: "7 PM", rsvp: "Riya", hosts: "The Sharmas" });
    expect(f.dates).toBe(formatDateRange(input.date, 3));
  });

  it("builds the text message from the same pieces as the card", () => {
    const text = defaultInvite(input, plan);
    const msg = composeMessage(text, inviteFacts(input, cleanOptions({ venue: "Rambagh Gardens", rsvp: "Riya", hosts: "The Sharmas" })));
    expect(msg).toContain("Venue: Rambagh Gardens");
    expect(msg).toContain("RSVP: Riya");
    expect(msg).toContain("– The Sharmas");
    // Missing time is dropped entirely, not left as a blank line.
    expect(msg).not.toContain("Time:");
    expect(msg).toMatch(/Date: .+\nVenue:/);
    expect(msg).not.toMatch(/\n{3,}/);
  });

  it("fills gaps in model output from the fallback, but allows empty extras", () => {
    const fallback = defaultInvite(input, plan);
    const out = normaliseInvite({ headline: "Shubh Vivah", body: "", details: "" }, fallback);
    expect(out.headline).toBe("Shubh Vivah");
    expect(out.body).toBe(fallback.body);
    expect(out.details).toBe("");
  });
});
