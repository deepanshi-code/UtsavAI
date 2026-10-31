import { describe, expect, it } from "vitest";
import { normaliseIdeas, normalisePlan } from "@/lib/normalise";
import { buildIdeasPrompt, buildPrompt } from "@/lib/prompts";
import { toResults } from "@/lib/places";
import { carryProgress } from "@/lib/progress";
import type { EventPlan, PlanInput } from "@/lib/types";

function inDays(n: number): string {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + n)).toISOString().slice(0, 10);
}

const input: PlanInput = {
  eventType: "wedding",
  title: "Riya & Arjun",
  date: inDays(60),
  city: "Jaipur",
  guests: 250,
  budget: 15_00_000,
  style: "Royal",
  preferences: "",
  days: 3,
  functions: [
    { name: "Mehendi", day: 1, guests: 80, theme: "Garden" },
    { name: "Wedding", day: 3, guests: 250, theme: "" },
  ],
  stay: { rooms: 30, nights: 2, tier: "luxury" },
};

describe("functions and stays in the prompt", () => {
  it("lists each function with its day, guests and theme", () => {
    const p = buildPrompt(input);
    expect(p).toContain("- Day 1: Mehendi, 80 guests, theme: Garden");
    expect(p).toContain("- Day 3: Wedding, 250 guests");
    expect(p).toContain("Guest stays: 30 hotel rooms for 2 night(s), luxury range");
  });

  it("asks for a personal planner voice and 10-12 creative ideas", () => {
    const p = buildPrompt(input);
    expect(p).toMatch(/first person plural/);
    expect(p).toMatch(/10-12 ideas/);
    expect(p).toMatch(/Gen-Z/);
  });
});

describe("normalisePlan: new sections", () => {
  it("keeps per-function details and the planner's note", () => {
    const plan = normalisePlan(
      {
        plannerNote: "We'll make it feel like home.",
        schedule: [
          {
            day: 1,
            time: "5 PM",
            title: "Mehendi",
            details: "",
            guests: 80,
            theme: "Garden",
            decor: "Marigolds",
            food: "Chaat",
            music: "Folk",
            attire: "Green",
          },
        ],
      },
      input,
    );
    expect(plan.plannerNote).toBe("We'll make it feel like home.");
    expect(plan.schedule[0]).toMatchObject({
      guests: 80,
      theme: "Garden",
      decor: "Marigolds",
      attire: "Green",
    });
  });

  it("keeps a stay plan only when the family asked for one", () => {
    const raw = {
      stay: {
        summary: "Book near the venue",
        where: "C-Scheme",
        costEstimate: "INR 8,000/night",
        tips: ["Block rooms early"],
        searchQuery: "5 star hotel!!",
      },
    };
    expect(normalisePlan(raw, input).stay).toMatchObject({ where: "C-Scheme", searchQuery: "5 star hotel" });
    expect(normalisePlan(raw, { ...input, stay: undefined }).stay).toBeNull();
  });

  it("gives ideas a known category and caps the list", () => {
    const ideas = normaliseIdeas([
      { title: "Silent disco", description: "", category: "Entertainment" },
      { title: "Mystery", description: "", category: "Made up" },
      { title: "", description: "no title" },
    ]);
    expect(ideas.map((i) => [i.title, i.category])).toEqual([
      ["Silent disco", "Entertainment"],
      ["Mystery", "Guest experience"],
    ]);
  });

  it("tells the model which ideas not to repeat", () => {
    const p = buildIdeasPrompt(input, ["Silent disco"], "Photos & social");
    expect(p).toContain("- Silent disco");
    expect(p).toContain('focused on the "Photos & social" category');
  });
});

describe("places", () => {
  it("maps API results, drops closed businesses and non-http links", () => {
    const out = toResults([
      {
        displayName: { text: "Lens Studio" },
        nationalPhoneNumber: "098765 43210",
        rating: 4.7,
        userRatingCount: 212,
        googleMapsUri: "https://maps.google.com/?cid=1",
        websiteUri: "javascript:alert(1)",
      },
      { displayName: { text: "Gone Ltd" }, businessStatus: "CLOSED_PERMANENTLY" },
      { formattedAddress: "no name" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      name: "Lens Studio",
      phone: "098765 43210",
      rating: 4.7,
      reviews: 212,
      mapsUrl: "https://maps.google.com/?cid=1",
    });
    expect(out[0].website).toBeUndefined();
  });

  it("keeps shortlisted businesses when a plan is refined", () => {
    const base = {
      title: "",
      summary: "",
      plannerNote: "",
      stay: null,
      schedule: [],
      venueTypes: [],
      budget: [],
      timeline: [],
      ideas: [],
      customs: [],
      risks: [],
    };
    const prev: EventPlan = {
      ...base,
      vendors: [
        {
          category: "Photographer",
          questions: "",
          priority: "must",
          shortlist: [{ name: "Lens Studio", phone: "1" }],
        },
      ],
    };
    const next: EventPlan = {
      ...base,
      vendors: [{ category: "photographer", questions: "new", priority: "must" }],
    };
    expect(carryProgress(prev, next).vendors[0].shortlist).toEqual([{ name: "Lens Studio", phone: "1" }]);
  });
});
