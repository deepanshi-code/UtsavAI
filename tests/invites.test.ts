import { describe, expect, it } from "vitest";
import { formatDate } from "@/lib/format";
import { buildInvitePrompt, cleanOptions, defaultInvite, designFor, inviteFacts, MAIN_KEY, occasionKey, occasionsFor } from "@/lib/invite";
import { rankTop } from "@/lib/places";
import type { PlanInput, ScheduleItem } from "@/lib/types";

const input: PlanInput = {
  eventType: "wedding",
  title: "Riya & Arjun",
  date: "2027-02-12",
  city: "Udaipur",
  guests: 220,
  budget: 30_00_000,
  style: "Royal",
  preferences: "",
  days: 3,
};

const schedule: ScheduleItem[] = [
  { day: 1, time: "11:00 AM", title: "Welcome lunch", details: "" }, // minor slot: no theme/decor
  { day: 1, time: "11:30 AM", title: "Haldi", details: "", guests: 80, theme: "Sunshine yellow", decor: "Marigolds" },
  { day: 2, time: "7:00 PM", title: "Sangeet", details: "", guests: 220, theme: "Bollywood retro", decor: "Disco" },
  { day: 3, time: "10:00 AM", title: "Wedding ceremony", details: "", guests: 220, theme: "Royal heritage", decor: "Gold" },
];

describe("invitations per function", () => {
  it("gives every real function its own card, plus the main one", () => {
    const occ = occasionsFor(input, schedule);
    expect(occ.map((o) => o.key)).toEqual([MAIN_KEY, "fn:1:haldi", "fn:2:sangeet", "fn:3:wedding ceremony"]);
    expect(occ[1]).toMatchObject({ title: "Haldi", guests: 80, time: "11:30 AM" });
  });

  it("only has the main card when there's a single function", () => {
    expect(occasionsFor(input, schedule.slice(0, 2)).map((o) => o.key)).toEqual([MAIN_KEY]);
  });

  it("starts each card with a design that matches the function", () => {
    const occ = occasionsFor(input, schedule);
    expect(designFor("wedding", occ[1])).toEqual({ template: "toran", palette: "haldi" });
    expect(designFor("wedding", occ[2])).toEqual({ template: "confetti", palette: "midnight" });
    expect(designFor("wedding", occ[3])).toEqual({ template: "arch", palette: "maroon" });
    expect(designFor("birthday")).toEqual({ template: "confetti", palette: "pastel" });
  });

  it("shows the function's own day and time, unless the host typed a time", () => {
    const haldi = occasionsFor(input, schedule)[1];
    const f = inviteFacts(input, cleanOptions({}), haldi);
    expect(f.dates).toBe(formatDate("2027-02-12"));
    expect(f.time).toBe("11:30 AM");
    expect(inviteFacts(input, cleanOptions({ time: "Noon" }), haldi).time).toBe("Noon");
    expect(inviteFacts(input, cleanOptions({}), occasionsFor(input, schedule)[2]).dates).toBe(formatDate("2027-02-13"));
    // The main card covers the whole range.
    expect(inviteFacts(input, cleanOptions({})).dates).toBe("12–14 Feb 2027");
  });

  it("asks the AI to write for that one function", () => {
    const sangeet = occasionsFor(input, schedule)[2];
    const p = buildInvitePrompt(input, { title: "", schedule }, cleanOptions({}), sangeet);
    // Includes the start time, so the wording doesn't call a 7 PM function an "afternoon".
    expect(p).toContain("This card is for one function: Sangeet (day 2, starts 7:00 PM, theme: Bollywood retro, about 220 guests)");
    expect(p).not.toContain("Functions: Day 1");
    expect(defaultInvite(input, { title: "" }, sangeet).headline).toBe("Sangeet · You're Invited");
  });

  it("keys functions by day and name", () => {
    expect(occasionKey({ day: 2, title: "Sangeet" })).toBe("fn:2:sangeet");
  });
});

describe("top vendors", () => {
  it("ranks by rating weighted by review count, not rating alone", () => {
    const ranked = rankTop(
      [
        { name: "New & shiny", rating: 5, reviews: 3 },
        { name: "Popular", rating: 4.6, reviews: 900 },
        { name: "Solid", rating: 4.4, reviews: 250 },
        { name: "Unrated" },
      ],
      3,
    );
    expect(ranked.map((r) => r.name)).toEqual(["Popular", "Solid", "New & shiny"]);
  });
});
