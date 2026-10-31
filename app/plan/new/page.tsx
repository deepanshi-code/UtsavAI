"use client";

import { ArrowLeft, ArrowRight, Plus, Trash, TriangleAlert } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import GenWait from "@/components/GenWait";
import LogSlider, { roundBudget, roundGuests } from "@/components/LogSlider";
import NumberField from "@/components/NumberField";
import Tilt from "@/components/Tilt";
import { useToast } from "@/components/Toast";
import { requestPlan } from "@/lib/api";
import { EVENT_META } from "@/lib/events";
import { formatDateRange, formatINR, todayIso } from "@/lib/format";
import { carryProgress } from "@/lib/progress";
import { getPlan, newId, savePlan, type SavedPlan } from "@/lib/store";
import { EVENT_TYPES, STAY_TIERS, type EventType, type FunctionInput, type PlanInput } from "@/lib/types";

const STYLES = [
  "Traditional",
  "Royal",
  "Regional heritage",
  "Minimal",
  "Modern",
  "Pastel",
  "Floral",
  "Garden",
  "Boho",
  "Rustic",
  "Vintage",
  "Bollywood",
  "Retro",
  "Luxury",
  "Intimate",
  "Destination",
  "Eco-friendly",
  "Neon party",
];

/** Preference chips, grouped so the list stays scannable. */
const PREFERENCE_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Food & drinks",
    items: [
      "Pure veg",
      "Jain options",
      "Non-veg",
      "Regional cuisine",
      "Live counters",
      "Street-food stalls",
      "Mocktail bar",
      "Dessert station",
    ],
  },
  {
    label: "Music & entertainment",
    items: [
      "DJ",
      "Live band",
      "Dhol",
      "Folk performers",
      "Silent disco",
      "Anchor / emcee",
      "Games",
      "Fireworks-free",
    ],
  },
  {
    label: "Photos & memories",
    items: [
      "Photographer",
      "Videographer",
      "Drone shots",
      "Photo booth",
      "Instant prints",
      "Reels creator",
      "Guestbook wall",
    ],
  },
  {
    label: "Comfort & access",
    items: ["Wheelchair access", "Elderly seating", "Kids zone", "Parking / valet", "Shuttle for guests"],
  },
  { label: "Values", items: ["Eco-friendly", "Zero plastic", "No alcohol", "Low noise", "Local artisans"] },
];

const FUNCTION_PRESETS: Record<EventType, string[]> = {
  wedding: [
    "Roka / Engagement",
    "Haldi",
    "Mehendi",
    "Sangeet",
    "Cocktail night",
    "Wedding ceremony",
    "Reception",
    "Puja",
  ],
  birthday: ["Party", "Family dinner", "Cake cutting", "After-party"],
  community: ["Opening ceremony", "Cultural night", "Food fair", "Sports day", "Closing ceremony"],
  festival: ["Sthapana / setup", "Puja", "Cultural evening", "Bhog / community meal", "Visarjan / closing"],
  corporate: ["Arrival & welcome", "Main session", "Team activity", "Gala dinner"],
  other: ["Ceremony", "Lunch", "Evening party"],
};

const TIER_LABEL: Record<(typeof STAY_TIERS)[number], string> = {
  budget: "Budget",
  mid: "Mid-range",
  luxury: "Luxury",
};
const CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Udaipur",
  "Lucknow",
  "Dehradun",
  "Chandigarh",
  "Kochi",
  "Indore",
  "Goa",
];

/** A sensible starting set of wedding functions for the number of days. */
function suggestedFunctions(type: EventType, days: number, guests: number): FunctionInput[] {
  if (type !== "wedding") return [];
  const small = Math.max(10, Math.round(guests * 0.5));
  const plans: Record<number, [string, number, number][]> = {
    1: [["Wedding ceremony", 1, guests]],
    2: [
      ["Mehendi", 1, small],
      ["Sangeet", 1, guests],
      ["Wedding ceremony", 2, guests],
    ],
    3: [
      ["Haldi", 1, small],
      ["Mehendi", 1, small],
      ["Sangeet", 2, guests],
      ["Wedding ceremony", 3, guests],
    ],
  };
  const pick = plans[Math.min(3, days)] ?? plans[3];
  const out = pick.map(([name, day, g]) => ({ name, day, guests: g, theme: "" }));
  if (days >= 4) out.push({ name: "Reception", day: days, guests, theme: "" });
  return out;
}

function inDays(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const DEFAULTS: PlanInput = {
  eventType: "wedding",
  title: "",
  date: inDays(90),
  city: "",
  guests: 150,
  budget: 10_00_000,
  style: "",
  preferences: "",
  milestone: "",
  days: 1,
};

function toggleInList(list: string, item: string) {
  const parts = list
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return (parts.includes(item) ? parts.filter((x) => x !== item) : [...parts, item]).join(", ");
}
const inList = (list: string, item: string) =>
  list
    .split(",")
    .map((x) => x.trim())
    .includes(item);

type StepId = "occasion" | "when" | "functions" | "style" | "review";
const STEP_LABEL: Record<StepId, string> = {
  occasion: "Occasion",
  when: "Date & guests",
  functions: "Functions & stay",
  style: "Preferences",
  review: "Review",
};

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<PlanInput>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  // Set when editing an existing plan (/plan/new?edit=<id>): regenerating updates that plan in place.
  const [editing, setEditing] = useState<SavedPlan | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Weddings and multi-day events get a step to plan each function and guest stays.
  const flow: StepId[] = [
    "occasion",
    "when",
    ...(f.eventType === "wedding" || (f.days ?? 1) > 1 ? (["functions"] as StepId[]) : []),
    "style",
    "review",
  ];
  const cur = flow[Math.min(step, flow.length - 1)];

  useEffect(() => {
    const editId = params.get("edit");
    const existing = editId ? getPlan(editId) : undefined;
    if (existing) {
      setEditing(existing);
      // Start from the functions as they are in the plan now, so edits made on the plan
      // page (times, guests, themes) carry into the regenerated plan.
      const current = (existing.plan.schedule ?? [])
        .filter((s) => s.theme || s.decor)
        .map((s) => ({
          name: s.title,
          day: s.day,
          guests: s.guests ?? existing.input.guests,
          theme: s.theme ?? "",
        }));
      setF({
        ...DEFAULTS,
        ...existing.input,
        functions: current.length ? current : (existing.input.functions ?? []),
      });
      return;
    }
    const t = params.get("type") as EventType | null;
    if (t && EVENT_TYPES.includes(t)) setF((p) => ({ ...p, eventType: t }));
  }, [params]);

  // Move focus to the new step's heading, except on first load.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setF((p) => ({ ...p, [k]: v }));
  // Reads the latest state, so quick successive chip clicks don't overwrite each other.
  const toggle = (k: "style" | "preferences", item: string) =>
    setF((p) => ({ ...p, [k]: toggleInList(p[k], item) }));
  const setFn = (i: number, patch: Partial<FunctionInput>) =>
    setF((p) => ({ ...p, functions: (p.functions ?? []).map((x, n) => (n === i ? { ...x, ...patch } : x)) }));
  const addFn = (name = "") =>
    setF((p) => ({
      ...p,
      functions: [
        ...(p.functions ?? []),
        { name, day: Math.min(p.days ?? 1, p.functions?.at(-1)?.day ?? 1), guests: p.guests, theme: "" },
      ],
    }));
  const removeFn = (i: number) =>
    setF((p) => ({ ...p, functions: (p.functions ?? []).filter((_, n) => n !== i) }));
  const meta = EVENT_META[f.eventType];
  const today = todayIso();
  const days = f.days ?? 1;

  const stepError = (): string => {
    if (cur === "when") {
      if (!f.city.trim()) return "Please enter the city.";
      if (!f.date || f.date < today) return "Please pick a date from today onwards.";
      if (f.guests < 1) return "Add at least one guest.";
      if (f.budget < 1000) return "Budget should be at least ₹1,000.";
    }
    if (cur === "functions" && (f.functions ?? []).some((x) => !x.name.trim()))
      return "Give every function a name, or remove the empty one.";
    return "";
  };

  const go = (to: number) => {
    // Prefill suggested wedding functions the first time the functions step opens.
    if (flow[to] === "functions" && f.functions === undefined)
      set("functions", suggestedFunctions(f.eventType, days, f.guests));
    setStep(to);
  };

  const next = () => {
    const e = stepError();
    if (e) return toast(e, "error");
    go(Math.min(flow.length - 1, step + 1));
  };

  async function generate() {
    setStatus("loading");
    setError("");
    // Drop function days beyond the chosen duration (if it was shortened later).
    const input: PlanInput = { ...f, functions: (f.functions ?? []).filter((x) => x.day <= days) };
    try {
      const res = await requestPlan(input);
      // Editing keeps the same plan (and its ticks, shortlists and invitations); otherwise it's a new one.
      const id = editing?.id ?? newId();
      const plan = editing ? carryProgress(editing.plan, res.plan) : res.plan;
      if (
        !savePlan({
          ...(editing ?? {}),
          id,
          input: { ...input, budget: res.budget },
          plan,
          source: res.source,
        })
      ) {
        toast("Couldn't save to this browser. Your plan won't be kept after you leave.", "error");
      }
      router.push(`/plan/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "loading")
    return <GenWait input={{ ...f, functions: (f.functions ?? []).filter((x) => x.day <= days) }} />;

  const perGuest = f.guests > 0 ? Math.round(f.budget / f.guests) : 0;

  return (
    <div className="wizard">
      <h1 className="sr-only">{editing ? "Edit your plan" : "Plan a new celebration"}</h1>
      <span className="eyebrow">{editing ? `Editing: ${editing.plan.title}` : "New plan"}</span>
      <div className="progress" aria-label={`Step ${step + 1} of ${flow.length}`}>
        {flow.map((s, i) => (
          <div
            key={s}
            className="progress-step"
            data-state={i < step ? "done" : i === step ? "current" : "todo"}
          >
            <div className="progress-bar">
              <span />
            </div>
            <div className="progress-label">
              {i + 1}. {STEP_LABEL[s]}
            </div>
          </div>
        ))}
      </div>

      {status === "error" && (
        <div className="alert alert-error mb-20" role="alert">
          <TriangleAlert className="flex-none" size={20} aria-hidden="true" />
          <div>
            <strong>Couldn&apos;t create your plan.</strong> {error}
            <div className="row mt-10">
              <button type="button" className="btn btn-sm btn-primary" onClick={generate}>
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      <form
        className="card wizard-panel"
        key={cur}
        onSubmit={(e) => {
          e.preventDefault();
          if (step < flow.length - 1) next();
          else generate();
        }}
      >
        {cur === "occasion" && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>
              What are you celebrating?
            </h2>
            <p className="muted">Choose the occasion. You can change any detail later.</p>
            <div
              className="type-grid"
              role="radiogroup"
              aria-label="Occasion"
              style={{ margin: "20px 0 28px" }}
            >
              {EVENT_TYPES.map((t) => {
                const Icon = EVENT_META[t].icon;
                return (
                  <Tilt
                    key={t}
                    as="button"
                    type="button"
                    role="radio"
                    aria-checked={f.eventType === t}
                    className="card card-hover type-card"
                    max={4}
                    onClick={() =>
                      setF((p) => ({
                        ...p,
                        eventType: t,
                        functions: p.eventType === t ? p.functions : undefined,
                      }))
                    }
                  >
                    <span className="icon-tile" aria-hidden="true">
                      <Icon size={22} strokeWidth={1.75} />
                    </span>
                    <strong>{EVENT_META[t].label}</strong>
                  </Tilt>
                );
              })}
            </div>
            <div className="grid-2">
              <div>
                <label htmlFor="title">
                  Event name <span className="hint">(optional)</span>
                </label>
                <input
                  id="title"
                  type="text"
                  value={f.title}
                  maxLength={80}
                  placeholder={f.eventType === "wedding" ? "Riya & Arjun's wedding" : "Aarav's birthday"}
                  onChange={(e) => set("title", e.target.value)}
                />
              </div>
              {meta.milestone && (
                <div>
                  <label htmlFor="milestone">
                    Age or milestone <span className="hint">(optional)</span>
                  </label>
                  <input
                    id="milestone"
                    type="text"
                    value={f.milestone}
                    maxLength={80}
                    placeholder={meta.milestone}
                    onChange={(e) => set("milestone", e.target.value)}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {cur === "when" && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>
              Date, place and size
            </h2>
            <p className="muted">
              Where and when it takes place, how many guests, and what you plan to spend.
            </p>
            <div className="grid-2 mt-24">
              <div>
                <label htmlFor="date">{days > 1 ? "Start date" : "Date"}</label>
                <input
                  id="date"
                  type="date"
                  required
                  min={today}
                  value={f.date}
                  onChange={(e) => set("date", e.target.value)}
                />
                {f.date >= today && <div className="hint mt-6">{formatDateRange(f.date, f.days)}</div>}
              </div>
              <div>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  required
                  list="cities"
                  value={f.city}
                  maxLength={80}
                  placeholder="Start typing… e.g. Jaipur"
                  autoComplete="address-level2"
                  onChange={(e) => set("city", e.target.value)}
                />
                <datalist id="cities">
                  {CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="field mt-24">
              <span className="label" id="days-label">
                Duration{" "}
                <span className="hint">
                  {f.eventType === "wedding"
                    ? "Many Indian weddings run 2–4 days"
                    : "Multi-day festivals and melas get a day-by-day schedule"}
                </span>
              </span>
              <div className="chips" role="radiogroup" aria-labelledby="days-label">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    className="chip"
                    aria-checked={days === d}
                    onClick={() => set("days", d)}
                  >
                    {d} day{d > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="field" style={{ marginTop: 28 }}>
              <div className="row">
                <label className="m-0" htmlFor="guests">
                  Guests
                </label>
                <span className="spacer" />
                <NumberField
                  aria-label="Guests (exact)"
                  min={1}
                  value={f.guests}
                  onValue={(n) => set("guests", Math.min(10000, n))}
                  style={{ width: 110 }}
                />
              </div>
              <div style={{ marginTop: 12 }}>
                <LogSlider
                  id="guests"
                  label="Guests"
                  value={f.guests}
                  min={5}
                  max={5000}
                  round={roundGuests}
                  format={(v) => `${v} guests`}
                  onChange={(v) => set("guests", v)}
                />
              </div>
            </div>

            <div className="field">
              <div className="row">
                <label className="m-0" htmlFor="budget">
                  Total budget
                </label>
                <span className="spacer" />
                <span className="big-value">{formatINR(f.budget)}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <LogSlider
                  id="budget"
                  label="Total budget"
                  value={f.budget}
                  min={10_000}
                  max={5_00_00_000}
                  round={roundBudget}
                  format={formatINR}
                  onChange={(v) => set("budget", v)}
                />
              </div>
              <div className="row mt-10">
                <span className="badge">{formatINR(perGuest)} per guest</span>
                {perGuest > 0 && perGuest < 400 && (
                  <span className="badge badge-warn">Tight for a catered event</span>
                )}
                <span className="spacer" />
                <NumberField
                  aria-label="Budget in rupees (exact)"
                  min={1000}
                  value={f.budget}
                  onValue={(n) => set("budget", Math.min(50_00_00_000, n))}
                  style={{ width: 150 }}
                />
              </div>
            </div>
          </>
        )}

        {cur === "functions" && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>
              Functions and guest stays
            </h2>
            <p className="muted">
              Plan each function on its own: its day, how many guests, and a theme. Leave it empty and
              we&apos;ll suggest the line-up.
            </p>

            <div className="field mt-20">
              {(f.functions ?? []).map((fn, i) => (
                <div className="fn-row" key={i}>
                  <div>
                    <label htmlFor={`fn-name-${i}`}>Function</label>
                    <input
                      id={`fn-name-${i}`}
                      type="text"
                      maxLength={40}
                      value={fn.name}
                      placeholder="e.g. Sangeet"
                      onChange={(e) => setFn(i, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`fn-day-${i}`}>Day</label>
                    <select
                      id={`fn-day-${i}`}
                      value={fn.day}
                      onChange={(e) => setFn(i, { day: Number(e.target.value) })}
                    >
                      {Array.from({ length: days }, (_, d) => (
                        <option key={d} value={d + 1}>
                          Day {d + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`fn-guests-${i}`}>Guests</label>
                    <NumberField
                      id={`fn-guests-${i}`}
                      min={1}
                      value={fn.guests}
                      onValue={(n) => setFn(i, { guests: Math.min(10000, n) })}
                    />
                  </div>
                  <div>
                    <label htmlFor={`fn-theme-${i}`}>
                      Theme <span className="hint">(optional)</span>
                    </label>
                    <input
                      id={`fn-theme-${i}`}
                      type="text"
                      maxLength={80}
                      value={fn.theme}
                      placeholder="e.g. Yellow florals, poolside"
                      onChange={(e) => setFn(i, { theme: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-danger"
                    aria-label={`Remove ${fn.name || "function"}`}
                    onClick={() => removeFn(i)}
                  >
                    <Trash size={16} />
                  </button>
                </div>
              ))}
              <div className="row mt-12">
                <span className="hint">Add:</span>
                {FUNCTION_PRESETS[f.eventType]
                  .filter((p) => !(f.functions ?? []).some((x) => x.name === p))
                  .map((p) => (
                    <button key={p} type="button" className="chip" onClick={() => addFn(p)}>
                      <Plus size={13} aria-hidden="true" /> {p}
                    </button>
                  ))}
                <button type="button" className="chip" onClick={() => addFn()}>
                  <Plus size={13} aria-hidden="true" /> Custom
                </button>
              </div>
            </div>

            <div
              className="field"
              style={{ marginTop: 28, paddingTop: 22, borderTop: "1px solid var(--border)" }}
            >
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={!!f.stay}
                  onChange={(e) =>
                    set(
                      "stay",
                      e.target.checked
                        ? { rooms: Math.max(1, Math.round(f.guests / 6)), nights: days, tier: "mid" }
                        : undefined,
                    )
                  }
                />
                <span>
                  Book hotel rooms for outstation guests
                  <span className="hint" style={{ display: "block", fontWeight: 400 }}>
                    We&apos;ll budget for it, suggest where to stay, and show hotels near you.
                  </span>
                </span>
              </label>
              {f.stay && (
                <div className="grid-2 mt-16">
                  <div>
                    <label htmlFor="rooms">Rooms</label>
                    <NumberField
                      id="rooms"
                      min={1}
                      value={f.stay.rooms}
                      onValue={(n) =>
                        setF((p) => ({ ...p, stay: p.stay && { ...p.stay, rooms: Math.min(500, n) } }))
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="nights">Nights</label>
                    <NumberField
                      id="nights"
                      min={1}
                      value={f.stay.nights}
                      onValue={(n) =>
                        setF((p) => ({ ...p, stay: p.stay && { ...p.stay, nights: Math.min(10, n) } }))
                      }
                    />
                  </div>
                  <div style={{ gridColumn: "1 / -1" }}>
                    <span className="label" id="tier-l">
                      Hotel range
                    </span>
                    <div className="chips" role="radiogroup" aria-labelledby="tier-l">
                      {STAY_TIERS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          role="radio"
                          className="chip"
                          aria-checked={f.stay?.tier === t}
                          onClick={() => setF((p) => ({ ...p, stay: p.stay && { ...p.stay, tier: t } }))}
                        >
                          {TIER_LABEL[t]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {cur === "style" && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>
              Style and preferences
            </h2>
            <p className="muted">
              Pick everything that feels like you. The more you choose, the more personal the plan.
            </p>
            <div className="field mt-24">
              <span className="label" id="style-label">
                Style
              </span>
              <div className="chips" role="group" aria-labelledby="style-label">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="chip"
                    aria-pressed={inList(f.style, s)}
                    onClick={() => toggle("style", s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="field" style={{ marginTop: 26 }}>
              {[
                {
                  label: "For this occasion",
                  items: meta.presets.filter((p) => !FUNCTION_PRESETS[f.eventType].includes(p)),
                },
                ...PREFERENCE_GROUPS,
              ]
                .filter((g) => g.items.length)
                .map((g) => (
                  <div className="pref-group" key={g.label}>
                    <span className="label" id={`pg-${g.label}`}>
                      {g.label}
                    </span>
                    <div className="chips" role="group" aria-labelledby={`pg-${g.label}`}>
                      {g.items.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className="chip"
                          aria-pressed={inList(f.preferences, p)}
                          onClick={() => toggle("preferences", p)}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
            <div className="field">
              <label htmlFor="preferences">
                Anything else? <span className="hint">Rituals, family traditions, things to avoid</span>
              </label>
              <textarea
                id="preferences"
                value={f.preferences}
                maxLength={900}
                placeholder="Bengali rituals, grandparents travelling from Kolkata, no fireworks…"
                onChange={(e) => set("preferences", e.target.value)}
              />
              <div className="hint" style={{ textAlign: "right", marginTop: 4 }}>
                {f.preferences.length}/900
              </div>
            </div>
          </>
        )}

        {cur === "review" && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>
              Review your details
            </h2>
            <p className="muted">
              {editing
                ? "We'll rebuild the plan from these details. Ticked tasks, vendor shortlists and invitations are kept."
                : "Check everything looks right, then we'll plan it with you."}
            </p>
            <div className="review-grid mt-20">
              {[
                ["Occasion", meta.label],
                ["Name", f.title || "—"],
                ...(meta.milestone ? [["Milestone", f.milestone || "—"]] : []),
                [days > 1 ? "Dates" : "Date", formatDateRange(f.date, f.days)],
                ["City", f.city],
                ["Guests", String(f.guests)],
                ["Budget", formatINR(f.budget)],
                ["Per guest", formatINR(perGuest)],
                ["Style", f.style || "—"],
                ...(f.stay
                  ? [
                      [
                        "Guest stays",
                        `${f.stay.rooms} rooms × ${f.stay.nights} nights, ${TIER_LABEL[f.stay.tier]}`,
                      ],
                    ]
                  : []),
              ].map(([k, v]) => (
                <div className="review-item" key={k}>
                  <div className="k">{k}</div>
                  <div className="v">{v}</div>
                </div>
              ))}
            </div>
            {(f.functions ?? []).length > 0 && (
              <div className="review-item mt-12">
                <div className="k">Functions</div>
                <div className="v fw-400">
                  {(f.functions ?? [])
                    .filter((x) => x.day <= days)
                    .map((x) => `Day ${x.day}: ${x.name} (${x.guests})`)
                    .join(" · ")}
                </div>
              </div>
            )}
            {f.preferences && (
              <div className="review-item mt-12">
                <div className="k">Preferences</div>
                <div className="v fw-400">{f.preferences}</div>
              </div>
            )}
          </>
        )}

        <div className="wizard-nav">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={16} aria-hidden="true" /> Back
            </button>
          )}
          <span className="spacer" />
          {step < flow.length - 1 ? (
            <button type="submit" className="btn btn-primary">
              Continue <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <button type="submit" className="btn btn-primary btn-lg">
              {editing ? "Regenerate plan" : "Plan it with us"} <ArrowRight size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      <div className="row small faint" style={{ marginTop: 16, justifyContent: "center" }}>
        {flow.map((s, i) => (
          <button
            key={s}
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={i > step}
            onClick={() => go(i)}
            aria-label={`Go to step ${i + 1}: ${STEP_LABEL[s]}`}
          >
            {i + 1}. {STEP_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NewPlanPage() {
  return (
    <div className="page">
      <div className="container">
        <Suspense
          fallback={<div className="skeleton" style={{ height: 400, maxWidth: 860, margin: "0 auto" }} />}
        >
          <Wizard />
        </Suspense>
      </div>
    </div>
  );
}
