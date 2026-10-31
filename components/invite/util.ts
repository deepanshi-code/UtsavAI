import type { InviteFacts, InviteText } from "@/lib/invite";
import type { Palette } from "./catalog";

/* Seeded randomness and small text helpers shared by the designs. */

/** Small seeded PRNG (mulberry32): the same seed always draws the same design. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
export function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return { day: String(d.getUTCDate()).padStart(2, "0"), month: MONTHS[d.getUTCMonth()], year: String(d.getUTCFullYear()), weekday: DAYS[d.getUTCDay()] };
}
/** Initials for a monogram: "Riya & Arjun's wedding" → "RA". */
export function monogram(names: string) {
  const parts = names.replace(/'s\b.*$/i, "").split(/\s*(?:&|and|weds|\+)\s*/i).map((s) => s.trim()).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : (names.trim()[0] ?? "")).toUpperCase();
}

/** Seeded choice, so "New pattern" gives each design a visibly different variation. */
export const pick = <T,>(r: () => number, options: readonly T[]): T => options[Math.floor(r() * options.length) % options.length];

export interface DesignProps {
  p: Palette;
  r: () => number;
  text: InviteText;
  facts: InviteFacts;
  /** Prefix for SVG ids, unique per card, so two cards on a page never share gradients. */
  uid: string;
}
