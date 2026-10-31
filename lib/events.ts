import { Briefcase, Cake, Flame, Gem, Sparkles, Users, type LucideIcon } from "lucide-react";
import type { EventType } from "./types";

export const EVENT_META: Record<
  EventType,
  { label: string; icon: LucideIcon; blurb: string; presets: string[]; milestone?: string }
> = {
  wedding: {
    label: "Wedding",
    icon: Gem,
    blurb: "Haldi to reception, every function in one plan",
    presets: ["Haldi", "Mehendi", "Sangeet", "Reception", "Eco-friendly", "Destination"],
  },
  birthday: {
    label: "Birthday",
    icon: Cake,
    blurb: "Kids' parties, surprises and milestone birthdays",
    presets: ["Kids' party", "Surprise", "Home party", "Theme party"],
    milestone: "e.g. 5th birthday, 60th (Shashtipoorthi)",
  },
  community: {
    label: "Community",
    icon: Users,
    blurb: "Society melas, fundraisers and cultural nights",
    presets: ["Society Diwali mela", "Charity fundraiser", "Sports day", "Cultural night"],
  },
  festival: {
    label: "Festival / puja",
    icon: Flame,
    blurb: "Pandals, garba nights and festive get-togethers",
    presets: ["Ganesh Chaturthi", "Durga Puja", "Navratri garba", "Eid get-together", "Christmas"],
  },
  corporate: {
    label: "Office party",
    icon: Briefcase,
    blurb: "Offsites, annual days and launches",
    presets: ["Team offsite", "Annual day", "Product launch"],
  },
  other: {
    label: "Other",
    icon: Sparkles,
    blurb: "Housewarmings, baby showers, anniversaries…",
    presets: ["Housewarming", "Baby shower", "Farewell", "Anniversary"],
    milestone: "e.g. 25th anniversary",
  },
};
