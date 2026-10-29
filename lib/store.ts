"use client";

import { useEffect, useState } from "react";
import type { EventPlan, PlanInput } from "./types";

/**
 * Plans are kept in the browser (localStorage) so there's no account or database.
 * Every access is wrapped: storage can be full, disabled or blocked (private mode).
 */

export interface SavedPlan {
  id: string;
  input: PlanInput;
  plan: EventPlan;
  source: "gemini" | "sample" | "shared";
  createdAt: number;
  updatedAt: number;
}

const KEY = "utsavai.plans.v1";
const EVENT = "utsavai:plans";

function readAll(): SavedPlan[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.filter((p) => p?.id && p?.plan && p?.input) : [];
  } catch {
    return [];
  }
}

function writeAll(plans: SavedPlan[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch {
    return false;
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function listPlans(): SavedPlan[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getPlan(id: string): SavedPlan | undefined {
  return readAll().find((p) => p.id === id);
}

/** Inserts or replaces by id. Returns false if the browser refused to store it. */
export function savePlan(p: Omit<SavedPlan, "updatedAt" | "createdAt"> & { createdAt?: number }): boolean {
  const all = readAll().filter((x) => x.id !== p.id);
  const now = Date.now();
  return writeAll([{ ...p, createdAt: p.createdAt ?? now, updatedAt: now }, ...all]);
}

export function deletePlan(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

/** Saved plans, kept in sync across components and browser tabs. `null` until loaded on the client. */
export function usePlans(): SavedPlan[] | null {
  const [plans, setPlans] = useState<SavedPlan[] | null>(null);
  useEffect(() => {
    const load = () => setPlans(listPlans());
    load();
    window.addEventListener(EVENT, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(EVENT, load);
      window.removeEventListener("storage", load);
    };
  }, []);
  return plans;
}
