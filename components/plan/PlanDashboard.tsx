"use client";

import { ArrowRight, CalendarPlus, Mail, Pencil, Printer, Share2, Trash, TriangleAlert, WandSparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Tilt from "../Tilt";
import { useToast } from "../Toast";
import BudgetPanel, { BudgetDonut } from "./BudgetPanel";
import { IdeasPanel, SchedulePanel, StayPanel, TimelinePanel, VendorsPanel } from "./Panels";
import VenuesPanel from "./VenuesPanel";
import { requestPlan } from "@/lib/api";
import { EVENT_META } from "@/lib/events";
import { daysUntil, formatDate, formatDateRange, formatINR, todayIso } from "@/lib/format";
import { buildIcs, taskDate } from "@/lib/ics";
import { carryProgress } from "@/lib/progress";
import { encodeShare } from "@/lib/share";
import type { SavedPlan } from "@/lib/store";

const TABS = ["Overview", "Schedule", "Venues", "Budget", "Timeline", "Vendors", "Ideas"] as const;
type Tab = (typeof TABS)[number];
// Display names; the plain ids above stay stable for element ids and state.
const TAB_LABEL: Record<Tab, string> = { Overview: "Overview", Schedule: "Functions", Venues: "Venues", Budget: "Budget", Timeline: "Tasks", Vendors: "Vendors", Ideas: "Ideas" };
const REFINE_SUGGESTIONS = ["Cut the budget by 20%", "Make it eco-friendly", "Add a kids' corner", "More traditional", "Make it a home event", "Add live music"];

function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface Props {
  saved: SavedPlan;
  onChange: (next: SavedPlan) => void;
  /** Shown above the header, e.g. "save a copy" for shared plans. */
  banner?: React.ReactNode;
  onDelete?: () => void;
  /** Link to the invitation studio; omitted for unsaved (shared) plans. */
  inviteHref?: string;
  /** Link to edit the plan's details and regenerate it; omitted for unsaved (shared) plans. */
  editHref?: string;
}

export default function PlanDashboard({ saved, onChange, banner, onDelete, inviteHref, editHref }: Props) {
  const { input } = saved;
  // Plans saved before schedules / venue types existed lack those fields.
  const plan = {
    ...saved.plan,
    schedule: saved.plan.schedule ?? [],
    venueTypes: saved.plan.venueTypes ?? [],
    plannerNote: saved.plan.plannerNote ?? "",
    stay: saved.plan.stay ?? null,
  };
  const eventDays = input.days ?? 1;
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("Overview");
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);
  const [ideating, setIdeating] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const refineInput = useRef<HTMLTextAreaElement>(null);

  const meta = EVENT_META[input.eventType];
  const days = daysUntil(input.date);
  const tasksDone = plan.timeline.filter((t) => t.done).length;
  const vendorsDone = plan.vendors.filter((v) => v.done).length;
  const today = todayIso();
  const upcoming = plan.timeline.filter((t) => !t.done).slice(0, 4);
  const slug = (plan.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event";

  useEffect(() => {
    if (!refineOpen) return;
    refineInput.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !refining && setRefineOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [refineOpen, refining]);

  // Edits build on the latest version, not the one this render saw, so quick
  // successive clicks (ticking two tasks) don't overwrite each other.
  const latest = useRef(saved);
  latest.current = saved;
  const change = (fn: (cur: SavedPlan) => SavedPlan) => {
    const next = fn(latest.current);
    latest.current = next;
    onChange(next);
  };
  const update = (p: (plan: SavedPlan["plan"]) => Partial<SavedPlan["plan"]>, i: Partial<SavedPlan["input"]> = {}) =>
    change((cur) => ({ ...cur, plan: { ...cur.plan, ...p(cur.plan) }, input: { ...cur.input, ...i } }));

  const share = async () => {
    const url = `${location.origin}/share#p=${encodeShare({ input, plan })}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Share link copied. Anyone with it can view this plan.", "success");
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  async function refine(instruction: string, done = "Plan updated.") {
    if (!instruction.trim()) return;
    setRefining(true);
    try {
      const res = await requestPlan(input, { instruction: instruction.trim(), previous: plan });
      change((cur) => ({ ...cur, plan: carryProgress(cur.plan, res.plan), input: { ...cur.input, budget: res.budget }, source: res.source }));
      setRefineOpen(false);
      setRefineText("");
      toast(done, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update the plan.", "error");
    } finally {
      setRefining(false);
    }
  }

  /** Re-plans a single function, leaving the rest of the plan as it is. */
  const replanFunction = (item: { title: string; day: number }, how: string) =>
    refine(
      `Rework only the "${item.title}" function on day ${item.day}: ${how}. Update its time, guests, theme, decor, food, music and dress code to match, ` +
        `and adjust the budget only if this change needs it. Keep every other function and the rest of the plan unchanged.`,
      `${item.title} re-planned.`,
    );

  /** Adds a fresh batch of ideas (optionally in one category) without touching anything else. */
  async function moreIdeas(focus: string) {
    setIdeating(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, existing: plan.ideas.map((i) => i.title), focus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't come up with more ideas.");
      update((p) => ({ ideas: [...p.ideas, ...(data.ideas ?? [])] }));
      toast(`${(data.ideas ?? []).length} new ideas added.`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't come up with more ideas.", "error");
    } finally {
      setIdeating(false);
    }
  }

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const n = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
    if (n < 0) return;
    e.preventDefault();
    setTab(TABS[n]);
    tabRefs.current[n]?.focus();
  };

  const counts: Partial<Record<Tab, string>> = {
    Schedule: String(plan.schedule.filter((s) => s.theme || s.decor).length || plan.schedule.length),
    Venues: plan.venueTypes.length ? String(plan.venueTypes.length) : undefined,
    Timeline: `${tasksDone}/${plan.timeline.length}`,
    Vendors: `${vendorsDone}/${plan.vendors.length}`,
    Ideas: String(plan.ideas.length + plan.customs.length),
  };

  return (
    <div>
      {banner}
      <div className="dash-head">
        <div style={{ flex: "1 1 420px" }}>
          <div className="row">
            <span className="badge badge-accent"><meta.icon size={14} aria-hidden="true" /> {meta.label}</span>
            {saved.source === "sample" && <span className="badge badge-warn">Sample: no API key configured</span>}
          </div>
          <h1>{plan.title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {formatDateRange(input.date, eventDays)}{eventDays > 1 ? ` (${eventDays} days)` : ""} · {input.city} · {input.guests} guests
          </p>
        </div>
        <div className="row no-print">
          {editHref && <a className="btn" href={editHref}><Pencil size={16} aria-hidden="true" /> Edit details</a>}
          <button type="button" className="btn btn-primary" onClick={() => setRefineOpen(true)}><WandSparkles size={17} aria-hidden="true" /> Refine with AI</button>
          {inviteHref && <a className="btn" href={inviteHref}><Mail size={17} aria-hidden="true" /> Invitation</a>}
          <button type="button" className="btn" onClick={share}><Share2 size={17} aria-hidden="true" /> Share</button>
          <button type="button" className="btn btn-icon" title="Add timeline to calendar" aria-label="Download calendar file (.ics)" onClick={() => { download(`${slug}.ics`, buildIcs(plan.title, input.date, plan.timeline, new Date(), plan.schedule), "text/calendar"); toast("Calendar file downloaded. Open it to add the tasks.", "success"); }}><CalendarPlus size={18} aria-hidden="true" /></button>
          <button type="button" className="btn btn-icon" title="Print or save as PDF" aria-label="Print or save as PDF" onClick={() => window.print()}><Printer size={18} aria-hidden="true" /></button>
          {onDelete && <button type="button" className="btn btn-icon btn-danger" title="Delete plan" aria-label="Delete plan" onClick={onDelete}><Trash size={18} aria-hidden="true" /></button>}
        </div>
      </div>

      <div className="stat-grid">
        {[
          { k: "Countdown", v: days > 0 ? `${days} days` : days === 0 ? "Today" : "Done", s: formatDateRange(input.date, eventDays) },
          { k: "Budget", v: formatINR(input.budget), s: `${formatINR(input.guests ? Math.round(input.budget / input.guests) : 0)} per guest` },
          { k: "Tasks done", v: `${tasksDone}/${plan.timeline.length}`, s: tasksDone === plan.timeline.length ? "All complete" : "on the timeline" },
          { k: "Vendors booked", v: `${vendorsDone}/${plan.vendors.length}`, s: "booked" },
        ].map((st) => (
          <Tilt key={st.k} className="card stat" max={4}>
            <div className="pop-sm">
              <div className="k">{st.k}</div>
              <div className="v">{st.v}</div>
              <div className="s">{st.s}</div>
            </div>
          </Tilt>
        ))}
      </div>

      <div className="tabs no-print" role="tablist" aria-label="Plan sections">
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => { tabRefs.current[i] = el; }}
            type="button"
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-${t}`}
            tabIndex={tab === t ? 0 : -1}
            className="tab"
            onClick={() => setTab(t)}
            onKeyDown={(e) => onTabKey(e, i)}
          >
            {TAB_LABEL[t]}
            {counts[t] && <span className="count">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {/* All panels stay in the DOM (hidden) so printing includes every section. */}
      <div role="tabpanel" id="panel-Overview" aria-labelledby="tab-Overview" hidden={tab !== "Overview"} className="tab-panel">
        {/* Bridges the page's h1 and the panels' h3 cards for screen-reader navigation. */}
        <h2 className="sr-only">{TAB_LABEL["Overview"]}</h2>
        {plan.plannerNote && (
          <section className="card planner-note" style={{ marginBottom: 20 }} aria-label="A note from your planner">
            <span className="eyebrow">From your planner</span>
            <p>{plan.plannerNote}</p>
          </section>
        )}
        <div className="two-col">
          <section className="card">
            <h3>Summary</h3>
            <p className="muted">{plan.summary}</p>
            {plan.risks.length > 0 && (
              <div className="alert alert-warn" style={{ marginTop: 16 }}>
                <TriangleAlert size={20} aria-hidden="true" style={{ flex: "none" }} />
                <div>
                  <strong>Watch out for</strong>
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {plan.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </section>
          <section className="card">
            <div className="row">
              <h3 style={{ margin: 0 }}>Budget at a glance</h3>
              <span className="spacer" />
              <button type="button" className="btn btn-sm btn-ghost no-print" onClick={() => setTab("Budget")}>Edit <ArrowRight size={14} aria-hidden="true" /></button>
            </div>
            <BudgetDonut items={plan.budget} size="compact" />
          </section>
        </div>
        <section className="card" style={{ marginTop: 20 }}>
          <div className="row">
            <h3 style={{ margin: 0 }}>Up next</h3>
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost no-print" onClick={() => setTab("Timeline")}>All tasks <ArrowRight size={14} aria-hidden="true" /></button>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>Every task is complete. Enjoy the celebration.</p>
          ) : (
            <ul className="legend" style={{ marginTop: 12 }}>
              {upcoming.map((t, i) => {
                const d = taskDate(input.date, t.daysBefore);
                return (
                  <li key={i}>
                    <span className={`tl-when ${d < today ? "overdue" : ""}`} style={{ minWidth: 130 }}>{formatDate(d)}</span>
                    <span style={{ flex: 1 }}>{t.task}</span>
                    <span className="badge">{t.owner}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <div role="tabpanel" id="panel-Schedule" aria-labelledby="tab-Schedule" hidden={tab !== "Schedule"} className="tab-panel">

        <h2 className="sr-only">{TAB_LABEL["Schedule"]}</h2>
        <SchedulePanel
          start={input.date}
          days={eventDays}
          schedule={plan.schedule}
          busy={refining}
          onChange={(schedule) => update(() => ({ schedule }))}
          onReplan={replanFunction}
        />
      </div>

      {/* The map iframe only mounts when the tab is opened, so it costs nothing until needed. */}
      <div role="tabpanel" id="panel-Venues" aria-labelledby="tab-Venues" hidden={tab !== "Venues"} className="tab-panel no-print">
        <h2 className="sr-only">{TAB_LABEL["Venues"]}</h2>
        {tab === "Venues" && <VenuesPanel city={input.city} eventType={input.eventType} venueTypes={plan.venueTypes} />}
        {plan.stay && <div style={{ marginTop: 20 }}><StayPanel stay={plan.stay} city={input.city} /></div>}
      </div>

      <div role="tabpanel" id="panel-Budget" aria-labelledby="tab-Budget" hidden={tab !== "Budget"} className="tab-panel">

        <h2 className="sr-only">{TAB_LABEL["Budget"]}</h2>
        <BudgetPanel
          items={plan.budget}
          total={input.budget}
          guests={input.guests}
          onChange={(budget, total) => update(() => ({ budget }), { budget: total })}
        />
      </div>

      <div role="tabpanel" id="panel-Timeline" aria-labelledby="tab-Timeline" hidden={tab !== "Timeline"} className="tab-panel">

        <h2 className="sr-only">{TAB_LABEL["Timeline"]}</h2>
        <TimelinePanel
          eventDate={input.date}
          tasks={plan.timeline}
          onToggle={(i) => update((p) => ({ timeline: p.timeline.map((t, n) => (n === i ? { ...t, done: !t.done } : t)) }))}
        />
      </div>

      <div role="tabpanel" id="panel-Vendors" aria-labelledby="tab-Vendors" hidden={tab !== "Vendors"} className="tab-panel">

        <h2 className="sr-only">{TAB_LABEL["Vendors"]}</h2>
        <VendorsPanel
          vendors={plan.vendors}
          city={input.city}
          occasion={meta.label.toLowerCase()}
          onToggle={(i) => update((p) => ({ vendors: p.vendors.map((v, n) => (n === i ? { ...v, done: !v.done } : v)) }))}
          onShortlist={(i, shortlist) => update((p) => ({ vendors: p.vendors.map((v, n) => (n === i ? { ...v, shortlist } : v)) }))}
        />
      </div>

      <div role="tabpanel" id="panel-Ideas" aria-labelledby="tab-Ideas" hidden={tab !== "Ideas"} className="tab-panel">

        <h2 className="sr-only">{TAB_LABEL["Ideas"]}</h2>
        <IdeasPanel ideas={plan.ideas} customs={plan.customs} onMore={moreIdeas} busy={ideating} />
      </div>

      {refineOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => !refining && setRefineOpen(false)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="refine-h">
            <div className="row">
              <h2 id="refine-h" style={{ fontSize: "1.5rem", margin: 0 }}>Refine your plan</h2>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" disabled={refining} onClick={() => setRefineOpen(false)}><X size={20} aria-hidden="true" /></button>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Describe a change in plain English. Everything else stays the same. Ticked tasks and vendors stay ticked; budget locks are reset.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); refine(refineText); }}>
              <label htmlFor="refine">What would you like to change?</label>
              <textarea
                id="refine"
                ref={refineInput}
                value={refineText}
                maxLength={400}
                disabled={refining}
                placeholder="e.g. Move the sangeet to a rooftop and add a live band"
                onChange={(e) => setRefineText(e.target.value)}
              />
              <div className="chips" style={{ margin: "14px 0 20px" }}>
                {REFINE_SUGGESTIONS.map((s) => (
                  <button type="button" key={s} className="chip" disabled={refining} onClick={() => setRefineText(s)}>{s}</button>
                ))}
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={refining || !refineText.trim()}>
                {refining ? "Updating… (10–20s)" : "Update plan"}
              </button>
            </form>
          </aside>
        </>
      )}
    </div>
  );
}
