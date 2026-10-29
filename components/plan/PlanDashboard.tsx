"use client";

import { useEffect, useRef, useState } from "react";
import Tilt from "../Tilt";
import { useToast } from "../Toast";
import BudgetPanel, { BudgetDonut } from "./BudgetPanel";
import { IdeasPanel, TimelinePanel, VendorsPanel } from "./Panels";
import { requestPlan } from "@/lib/api";
import { EVENT_META } from "@/lib/events";
import { daysUntil, formatDate, formatINR, todayIso } from "@/lib/format";
import { buildIcs, taskDate } from "@/lib/ics";
import { carryProgress } from "@/lib/progress";
import { encodeShare } from "@/lib/share";
import type { SavedPlan } from "@/lib/store";

const TABS = ["Overview", "Budget", "Timeline", "Vendors", "Ideas"] as const;
type Tab = (typeof TABS)[number];
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
}

export default function PlanDashboard({ saved, onChange, banner, onDelete }: Props) {
  const { input, plan } = saved;
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("Overview");
  const [refineOpen, setRefineOpen] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [refining, setRefining] = useState(false);
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

  async function refine(instruction: string) {
    if (!instruction.trim()) return;
    setRefining(true);
    try {
      const res = await requestPlan(input, { instruction: instruction.trim(), previous: plan });
      change((cur) => ({ ...cur, plan: carryProgress(cur.plan, res.plan), input: { ...cur.input, budget: res.budget }, source: res.source }));
      setRefineOpen(false);
      setRefineText("");
      toast("Plan updated.", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update the plan.", "error");
    } finally {
      setRefining(false);
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
    Budget: String(plan.budget.length),
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
            <span className="badge badge-accent">{meta.emoji} {meta.label}</span>
            {saved.source === "sample" && <span className="badge badge-warn">Sample: no API key configured</span>}
          </div>
          <h1>{plan.title}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {formatDate(input.date)} · {input.city} · {input.guests} guests
          </p>
        </div>
        <div className="row no-print">
          <button type="button" className="btn btn-primary" onClick={() => setRefineOpen(true)}>✦ Refine with AI</button>
          <button type="button" className="btn" onClick={share}>🔗 Share</button>
          <button type="button" className="btn btn-icon" title="Add timeline to calendar" aria-label="Download calendar file (.ics)" onClick={() => { download(`${slug}.ics`, buildIcs(plan.title, input.date, plan.timeline), "text/calendar"); toast("Calendar file downloaded. Open it to add the tasks.", "success"); }}>🗓️</button>
          <button type="button" className="btn btn-icon" title="Print or save as PDF" aria-label="Print or save as PDF" onClick={() => window.print()}>🖨️</button>
          {onDelete && <button type="button" className="btn btn-icon btn-danger" title="Delete plan" aria-label="Delete plan" onClick={onDelete}>🗑️</button>}
        </div>
      </div>

      <div className="stat-grid">
        {[
          { k: "Countdown", v: days > 0 ? `${days} days` : days === 0 ? "Today! 🎉" : "Done", s: formatDate(input.date) },
          { k: "Budget", v: formatINR(input.budget), s: `${formatINR(input.guests ? Math.round(input.budget / input.guests) : 0)} per guest` },
          { k: "Tasks", v: `${tasksDone}/${plan.timeline.length}`, s: tasksDone === plan.timeline.length ? "All done ✓" : "on the timeline" },
          { k: "Vendors", v: `${vendorsDone}/${plan.vendors.length}`, s: "booked" },
        ].map((st) => (
          <Tilt key={st.k} className="card stat" max={10}>
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
            {t}
            {counts[t] && <span className="count">{counts[t]}</span>}
          </button>
        ))}
      </div>

      {/* All panels stay in the DOM (hidden) so printing includes every section. */}
      <div role="tabpanel" id="panel-Overview" aria-labelledby="tab-Overview" hidden={tab !== "Overview"} className="tab-panel">
        <div className="two-col">
          <section className="card">
            <h3>Summary</h3>
            <p className="muted">{plan.summary}</p>
            {plan.risks.length > 0 && (
              <div className="alert alert-warn" style={{ marginTop: 16 }}>
                <span aria-hidden="true">⚠️</span>
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
              <button type="button" className="btn btn-sm btn-ghost no-print" onClick={() => setTab("Budget")}>Edit →</button>
            </div>
            <BudgetDonut items={plan.budget} size="compact" />
          </section>
        </div>
        <section className="card" style={{ marginTop: 20 }}>
          <div className="row">
            <h3 style={{ margin: 0 }}>Up next</h3>
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost no-print" onClick={() => setTab("Timeline")}>Full timeline →</button>
          </div>
          {upcoming.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>Every task is done. Enjoy the celebration! 🎉</p>
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

      <div role="tabpanel" id="panel-Budget" aria-labelledby="tab-Budget" hidden={tab !== "Budget"} className="tab-panel">
        <BudgetPanel
          items={plan.budget}
          total={input.budget}
          guests={input.guests}
          onChange={(budget, total) => update(() => ({ budget }), { budget: total })}
        />
      </div>

      <div role="tabpanel" id="panel-Timeline" aria-labelledby="tab-Timeline" hidden={tab !== "Timeline"} className="tab-panel">
        <TimelinePanel
          eventDate={input.date}
          tasks={plan.timeline}
          onToggle={(i) => update((p) => ({ timeline: p.timeline.map((t, n) => (n === i ? { ...t, done: !t.done } : t)) }))}
        />
      </div>

      <div role="tabpanel" id="panel-Vendors" aria-labelledby="tab-Vendors" hidden={tab !== "Vendors"} className="tab-panel">
        <VendorsPanel
          vendors={plan.vendors}
          onToggle={(i) => update((p) => ({ vendors: p.vendors.map((v, n) => (n === i ? { ...v, done: !v.done } : v)) }))}
        />
      </div>

      <div role="tabpanel" id="panel-Ideas" aria-labelledby="tab-Ideas" hidden={tab !== "Ideas"} className="tab-panel">
        <IdeasPanel ideas={plan.ideas} customs={plan.customs} />
      </div>

      {refineOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => !refining && setRefineOpen(false)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="refine-h">
            <div className="row">
              <h2 id="refine-h" style={{ fontSize: "1.4rem", margin: 0 }}>✦ Refine your plan</h2>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" disabled={refining} onClick={() => setRefineOpen(false)}>✕</button>
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Describe a change in plain English. Everything else stays the same. Ticked tasks and vendors stay ticked; budget locks are reset.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); refine(refineText); }}>
              <label htmlFor="refine">What should change?</label>
              <textarea
                id="refine"
                ref={refineInput}
                value={refineText}
                maxLength={300}
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
