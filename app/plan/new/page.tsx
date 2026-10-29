"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import LogSlider, { roundBudget, roundGuests } from "@/components/LogSlider";
import Tilt from "@/components/Tilt";
import { useToast } from "@/components/Toast";
import { requestPlan } from "@/lib/api";
import { EVENT_META } from "@/lib/events";
import { formatDate, formatINR, todayIso } from "@/lib/format";
import { newId, savePlan } from "@/lib/store";
import { EVENT_TYPES, type EventType, type PlanInput } from "@/lib/types";

const STEPS = ["Occasion", "When & where", "Style & needs", "Review"];
const STYLES = ["Traditional", "Minimal", "Pastel", "Royal", "Boho", "Bollywood", "Rustic", "Modern"];
const CITIES = ["Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Dehradun", "Chandigarh", "Kochi", "Indore", "Goa"];
const GEN_STEPS = ["Understanding your event", "Balancing the budget", "Scheduling the timeline", "Shortlisting vendors", "Adding ideas & customs"];

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
};

function toggleInList(list: string, item: string) {
  const parts = list.split(",").map((x) => x.trim()).filter(Boolean);
  return (parts.includes(item) ? parts.filter((x) => x !== item) : [...parts, item]).join(", ");
}
const inList = (list: string, item: string) => list.split(",").map((x) => x.trim()).includes(item);

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<PlanInput>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [genStep, setGenStep] = useState(0);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Pre-select the occasion picked on the landing page (?type=birthday).
  useEffect(() => {
    const t = params.get("type") as EventType | null;
    if (t && EVENT_TYPES.includes(t)) setF((p) => ({ ...p, eventType: t }));
  }, [params]);

  // Move focus to the new step's heading so keyboard and screen-reader users follow
  // along, but not on first load, where it would skip past the page navigation.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [step]);

  const set = <K extends keyof PlanInput>(k: K, v: PlanInput[K]) => setF((p) => ({ ...p, [k]: v }));
  // Reads the latest state, so quick successive chip clicks don't overwrite each other.
  const toggle = (k: "style" | "preferences", item: string) => setF((p) => ({ ...p, [k]: toggleInList(p[k], item) }));
  const meta = EVENT_META[f.eventType];
  const today = todayIso();

  const stepError = (): string => {
    if (step === 1) {
      if (!f.city.trim()) return "Please enter the city.";
      if (!f.date || f.date < today) return "Please pick a date from today onwards.";
      if (f.guests < 1) return "Add at least one guest.";
      if (f.budget < 1000) return "Budget should be at least ₹1,000.";
    }
    return "";
  };

  const next = () => {
    const e = stepError();
    if (e) return toast(e, "error");
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  async function generate() {
    setStatus("loading");
    setError("");
    setGenStep(0);
    const timer = setInterval(() => setGenStep((g) => Math.min(GEN_STEPS.length - 1, g + 1)), 2800);
    try {
      const res = await requestPlan(f);
      const id = newId();
      if (!savePlan({ id, input: { ...f, budget: res.budget }, plan: res.plan, source: res.source })) {
        toast("Couldn't save to this browser. Your plan won't be kept after you leave.", "error");
      }
      router.push(`/plan/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    } finally {
      clearInterval(timer);
    }
  }

  if (status === "loading") {
    return (
      <div className="gen" role="status" aria-live="polite">
        <div className="orb" aria-hidden="true" />
        <h2>Planning your {meta.label.toLowerCase()}…</h2>
        <p className="muted">This usually takes 10–20 seconds, longer when Gemini is busy.</p>
        <ol className="gen-steps">
          {GEN_STEPS.map((s, i) => (
            <li key={s} data-state={i < genStep ? "done" : i === genStep ? "active" : "todo"}>
              <span className="gen-dot" aria-hidden="true">{i < genStep ? "✓" : ""}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const perGuest = f.guests > 0 ? Math.round(f.budget / f.guests) : 0;

  return (
    <div className="wizard">
      <span className="eyebrow">New plan</span>
      <div className="progress" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <div key={s} className="progress-step" data-state={i < step ? "done" : i === step ? "current" : "todo"}>
            <div className="progress-bar"><span /></div>
            <div className="progress-label">{i + 1}. {s}</div>
          </div>
        ))}
      </div>

      {status === "error" && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 20 }}>
          <span aria-hidden="true">⚠️</span>
          <div>
            <strong>Couldn&apos;t create your plan.</strong> {error}
            <div className="row" style={{ marginTop: 10 }}>
              <button type="button" className="btn btn-sm btn-primary" onClick={generate}>Try again</button>
            </div>
          </div>
        </div>
      )}

      <form
        className="card wizard-panel"
        key={step}
        onSubmit={(e) => {
          e.preventDefault();
          if (step < STEPS.length - 1) next();
          else generate();
        }}
      >
        {step === 0 && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>What are you celebrating?</h2>
            <p className="muted">Choose the occasion. You can fine-tune everything later.</p>
            <div className="type-grid" role="radiogroup" aria-label="Occasion" style={{ margin: "20px 0 28px" }}>
              {EVENT_TYPES.map((t) => (
                <Tilt
                  key={t}
                  as="button"
                  type="button"
                  role="radio"
                  aria-checked={f.eventType === t}
                  className="card card-hover type-card"
                  max={10}
                  onClick={() => set("eventType", t)}
                >
                  <span className="pop-sm" style={{ display: "block" }}>
                    <span className="emoji" aria-hidden="true">{EVENT_META[t].emoji}</span>
                    <strong>{EVENT_META[t].label}</strong>
                  </span>
                </Tilt>
              ))}
            </div>
            <div className="grid-2">
              <div>
                <label htmlFor="title">Event name <span className="hint">(optional)</span></label>
                <input id="title" type="text" value={f.title} maxLength={80} placeholder={f.eventType === "wedding" ? "Riya & Arjun's wedding" : "Aarav's birthday"} onChange={(e) => set("title", e.target.value)} />
              </div>
              {meta.milestone && (
                <div>
                  <label htmlFor="milestone">Age or milestone <span className="hint">(optional)</span></label>
                  <input id="milestone" type="text" value={f.milestone} maxLength={80} placeholder={meta.milestone} onChange={(e) => set("milestone", e.target.value)} />
                </div>
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>When, where and how big?</h2>
            <p className="muted">Slide to set your guest count and budget. We&apos;ll show what that means per guest.</p>
            <div className="grid-2" style={{ marginTop: 24 }}>
              <div>
                <label htmlFor="date">Date</label>
                <input id="date" type="date" required min={today} value={f.date} onChange={(e) => set("date", e.target.value)} />
                {f.date >= today && <div className="hint" style={{ marginTop: 6 }}>{formatDate(f.date)}</div>}
              </div>
              <div>
                <label htmlFor="city">City</label>
                <input id="city" type="text" required list="cities" value={f.city} maxLength={80} placeholder="Start typing… e.g. Jaipur" autoComplete="address-level2" onChange={(e) => set("city", e.target.value)} />
                <datalist id="cities">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>

            <div className="field" style={{ marginTop: 28 }}>
              <div className="row">
                <label htmlFor="guests" style={{ margin: 0 }}>Guests</label>
                <span className="spacer" />
                <input type="number" aria-label="Guests (exact)" min={1} max={10000} value={f.guests} onChange={(e) => set("guests", Math.max(0, Math.round(Number(e.target.value))))} style={{ width: 110 }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <LogSlider id="guests" label="Guests" value={f.guests} min={5} max={5000} round={roundGuests} format={(v) => `${v} guests`} onChange={(v) => set("guests", v)} />
              </div>
            </div>

            <div className="field">
              <div className="row">
                <label htmlFor="budget" style={{ margin: 0 }}>Total budget</label>
                <span className="spacer" />
                <span className="big-value grad-text">{formatINR(f.budget)}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <LogSlider id="budget" label="Total budget" value={f.budget} min={10_000} max={5_00_00_000} round={roundBudget} format={formatINR} onChange={(v) => set("budget", v)} />
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <span className="badge">{formatINR(perGuest)} per guest</span>
                {perGuest > 0 && perGuest < 400 && <span className="badge badge-warn">Tight for a catered event</span>}
                <span className="spacer" />
                <input type="number" aria-label="Budget in rupees (exact)" min={1000} step={1000} value={f.budget} onChange={(e) => set("budget", Math.max(0, Math.round(Number(e.target.value))))} style={{ width: 150 }} />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>Make it yours</h2>
            <p className="muted">The more you tell us, the more personal the plan. Everything here is optional.</p>
            <div className="field" style={{ marginTop: 24 }}>
              <span className="label" id="style-label">Style</span>
              <div className="chips" role="group" aria-labelledby="style-label">
                {STYLES.map((s) => (
                  <button key={s} type="button" className="chip" aria-pressed={inList(f.style, s)} onClick={() => toggle("style", s)}>{s}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label" id="preset-label">Include</span>
              <div className="chips" role="group" aria-labelledby="preset-label">
                {meta.presets.map((p) => (
                  <button key={p} type="button" className="chip" aria-pressed={inList(f.preferences, p)} onClick={() => toggle("preferences", p)}>{p}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label htmlFor="preferences">Anything else? <span className="hint">Food, rituals, accessibility, must-haves, things to avoid</span></label>
              <textarea id="preferences" value={f.preferences} maxLength={500} placeholder="Pure veg, elderly guests need ramp access, no fireworks, Bengali rituals…" onChange={(e) => set("preferences", e.target.value)} />
              <div className="hint" style={{ textAlign: "right", marginTop: 4 }}>{f.preferences.length}/500</div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 ref={headingRef} tabIndex={-1}>Ready to plan?</h2>
            <p className="muted">Check the details. Use Back or the step links below to change anything.</p>
            <div className="review-grid" style={{ marginTop: 20 }}>
              {[
                ["Occasion", `${meta.emoji} ${meta.label}`],
                ["Name", f.title || "—"],
                ...(meta.milestone ? [["Milestone", f.milestone || "—"]] : []),
                ["Date", formatDate(f.date)],
                ["City", f.city],
                ["Guests", String(f.guests)],
                ["Budget", formatINR(f.budget)],
                ["Per guest", formatINR(perGuest)],
                ["Style", f.style || "—"],
              ].map(([k, v]) => (
                <div className="review-item" key={k}>
                  <div className="k">{k}</div>
                  <div className="v">{v}</div>
                </div>
              ))}
            </div>
            {f.preferences && (
              <div className="review-item" style={{ marginTop: 12 }}>
                <div className="k">Preferences</div>
                <div className="v" style={{ fontWeight: 400 }}>{f.preferences}</div>
              </div>
            )}
          </>
        )}

        <div className="wizard-nav">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>← Back</button>}
          <span className="spacer" />
          {step < STEPS.length - 1 ? (
            <button type="submit" className="btn btn-primary">Continue →</button>
          ) : (
            <button type="submit" className="btn btn-primary btn-lg">✦ Generate my plan</button>
          )}
        </div>
      </form>

      <div className="row small faint" style={{ marginTop: 16, justifyContent: "center" }}>
        {STEPS.map((s, i) => (
          <button key={s} type="button" className="btn btn-ghost btn-sm" disabled={i > step} onClick={() => setStep(i)} aria-label={`Go to step ${i + 1}: ${s}`}>
            {i + 1}. {s}
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
        <Suspense fallback={<div className="skeleton" style={{ height: 400, maxWidth: 860, margin: "0 auto" }} />}>
          <Wizard />
        </Suspense>
      </div>
    </div>
  );
}
