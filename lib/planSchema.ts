import { Type, type Schema } from "@google/genai";
import { IDEA_CATEGORIES } from "./types";

/* Gemini structured-output schemas for plans and extra ideas. */

/** Shared by the plan and the "more ideas" request. */
const IDEAS_ITEMS: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Catchy, specific name, max 6 words." },
      description: {
        type: Type.STRING,
        description: "What it is and why guests will love it, max 35 words.",
      },
      category: { type: Type.STRING, enum: [...IDEA_CATEGORIES] },
    },
    required: ["title", "description", "category"],
  },
};

/** Gemini structured-output schema. Mirrors EventPlan minus client-only fields. */
export const PLAN_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    summary: { type: Type.STRING, description: "2-3 sentence overview of the plan." },
    plannerNote: {
      type: Type.STRING,
      description:
        "3-4 warm sentences from the family's own planner, in first person plural ('we'), about how we'll make this celebration feel like theirs.",
    },
    stay: {
      type: Type.OBJECT,
      nullable: true,
      description: "Hotel plan for outstation guests. null unless the event details ask for guest stays.",
      properties: {
        summary: { type: Type.STRING },
        where: {
          type: Type.STRING,
          description: "Which area of the city to book in, and why (near the venue, transport).",
        },
        costEstimate: {
          type: Type.STRING,
          description: "e.g. INR 4,500-6,000 per room per night, about INR 3.2 lakh total.",
        },
        tips: { type: Type.ARRAY, items: { type: Type.STRING } },
        searchQuery: {
          type: Type.STRING,
          description: "Short hotel map search without the city, e.g. 4 star hotel.",
        },
      },
      required: ["summary", "where", "costEstimate", "tips", "searchQuery"],
    },
    totalBudget: {
      type: Type.INTEGER,
      description:
        "Sum of all budget amounts in INR. Equals the user's total unless a change request explicitly changes it.",
    },
    schedule: {
      type: Type.ARRAY,
      description: "Day-by-day run of functions during the celebration itself, in order.",
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER, description: "1 = first day of the celebration." },
          time: { type: Type.STRING, description: "Start time, e.g. 7:00 PM." },
          title: { type: Type.STRING, description: "Function or slot, e.g. Haldi, Sangeet, Cake cutting." },
          details: { type: Type.STRING },
          guests: { type: Type.INTEGER, description: "Expected guests for this function." },
          theme: {
            type: Type.STRING,
            description: "Theme or mood for this function. Empty for minor slots.",
          },
          decor: { type: Type.STRING, description: "One-line decor direction. Empty for minor slots." },
          food: { type: Type.STRING, description: "One-line food & drinks plan. Empty for minor slots." },
          music: {
            type: Type.STRING,
            description: "One-line music / entertainment plan. Empty for minor slots.",
          },
          attire: {
            type: Type.STRING,
            description: "Suggested dress code / colours. Empty for minor slots.",
          },
        },
        required: ["day", "time", "title", "details", "guests", "theme", "decor", "food", "music", "attire"],
      },
    },
    venueTypes: {
      type: Type.ARRAY,
      description: "Kinds of venue that suit this event. Never name specific venues.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "e.g. Banquet hall, Farmhouse lawn, Rooftop restaurant." },
          why: { type: Type.STRING },
          capacity: { type: Type.STRING, description: "Typical guest range, e.g. 150-300 guests." },
          priceRange: { type: Type.STRING, description: "Typical local cost, e.g. INR 800-1,500 per plate." },
          searchQuery: {
            type: Type.STRING,
            description: "Short map search phrase without the city, e.g. banquet hall.",
          },
        },
        required: ["type", "why", "capacity", "priceRange", "searchQuery"],
      },
    },
    budget: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          amount: { type: Type.INTEGER, description: "Whole rupees." },
          notes: { type: Type.STRING, description: "What this covers and one way to save." },
        },
        required: ["category", "amount", "notes"],
      },
    },
    timeline: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          daysBefore: { type: Type.INTEGER, description: "Days before the event; 0 is the event day." },
          task: { type: Type.STRING },
          owner: { type: Type.STRING, description: "Who should do it, e.g. Host, Family, Planner." },
        },
        required: ["daysBefore", "task", "owner"],
      },
    },
    vendors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          questions: { type: Type.STRING, description: "What to ask or verify before booking." },
          priority: { type: Type.STRING, enum: ["must", "nice"] },
        },
        required: ["category", "questions", "priority"],
      },
    },
    ideas: IDEAS_ITEMS,
    customs: {
      type: Type.ARRAY,
      description: "Relevant Indian / regional rituals or customs. Empty if not applicable.",
      items: {
        type: Type.OBJECT,
        properties: { name: { type: Type.STRING }, description: { type: Type.STRING } },
        required: ["name", "description"],
      },
    },
    risks: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: [
    "title",
    "summary",
    "plannerNote",
    "stay",
    "totalBudget",
    "schedule",
    "venueTypes",
    "budget",
    "timeline",
    "vendors",
    "ideas",
    "customs",
    "risks",
  ],
};

export const IDEAS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: { ideas: IDEAS_ITEMS },
  required: ["ideas"],
};
