"use client";

import { ArrowRight, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import Tilt from "@/components/Tilt";
import { useToast } from "@/components/Toast";
import { EVENT_META } from "@/lib/events";
import { daysUntil, formatDate, formatINR } from "@/lib/format";
import { deletePlan, usePlans } from "@/lib/store";

type Sort = "recent" | "soonest";

export default function PlansPage() {
  const plans = usePlans();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");

  const shown = useMemo(() => {
    if (!plans) return [];
    const needle = q.trim().toLowerCase();
    const list = plans.filter(
      (p) => !needle || `${p.plan.title} ${p.input.city} ${p.input.eventType}`.toLowerCase().includes(needle),
    );
    return sort === "soonest" ? [...list].sort((a, b) => a.input.date.localeCompare(b.input.date)) : list;
  }, [plans, q, sort]);

  return (
    <div className="page container">
      <div className="row" style={{ marginBottom: 28 }}>
        <div>
          <span className="eyebrow">Your celebrations</span>
          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", margin: "6px 0 0" }}>My plans</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Saved in this browser only. Use Share to open a plan on another device.
          </p>
        </div>
        <span className="spacer" />
        <Link href="/plan/new" className="btn btn-primary">
          + New plan
        </Link>
      </div>

      {plans === null ? (
        <div className="plans-grid">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton" style={{ height: 200 }} />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className="card empty">
          <div className="big" aria-hidden="true">
            <NotebookPen size={40} strokeWidth={1.5} />
          </div>
          <h2>No plans yet</h2>
          <p className="muted">Create your first plan. It takes about a minute.</p>
          <Link href="/plan/new" className="btn btn-primary mt-12">
            Start planning <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <div className="row mb-20">
            <input
              type="text"
              aria-label="Search plans"
              placeholder="Search by name, city or occasion…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 360 }}
            />
            <span className="spacer" />
            <div className="chips" role="group" aria-label="Sort">
              <button
                type="button"
                className="chip"
                aria-pressed={sort === "recent"}
                onClick={() => setSort("recent")}
              >
                Recently edited
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={sort === "soonest"}
                onClick={() => setSort("soonest")}
              >
                Event date
              </button>
            </div>
          </div>
          {shown.length === 0 && <p className="muted">No plans match &ldquo;{q}&rdquo;.</p>}
          <div className="plans-grid">
            {shown.map((p) => {
              const meta = EVENT_META[p.input.eventType];
              const days = daysUntil(p.input.date);
              const total = p.plan.timeline.length + p.plan.vendors.length;
              const done =
                p.plan.timeline.filter((t) => t.done).length + p.plan.vendors.filter((v) => v.done).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <Tilt key={p.id} className="card card-hover plan-card">
                  <div className="row">
                    <span className="badge badge-accent">
                      <meta.icon size={14} aria-hidden="true" /> {meta.label}
                    </span>
                    <span className="spacer" />
                    <span className={`badge ${days < 0 ? "" : days <= 14 ? "badge-warn" : ""}`}>
                      {days > 0 ? `in ${days} days` : days === 0 ? "today" : "past"}
                    </span>
                  </div>
                  <h2 className="h3">
                    <Link href={`/plan/${p.id}`} style={{ position: "static" }}>
                      {p.plan.title}
                      <span style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
                    </Link>
                  </h2>
                  <p className="muted small m-0">
                    {formatDate(p.input.date)} · {p.input.city} · {p.input.guests} guests
                  </p>
                  <span className="spacer" />
                  <div style={{ marginTop: 16 }}>
                    <div className="row small">
                      <strong>{formatINR(p.input.budget)}</strong>
                      <span className="spacer" />
                      <span className="faint">{pct}% done</span>
                    </div>
                    <div
                      className="bar"
                      role="progressbar"
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Tasks and vendors done"
                    >
                      <span style={{ width: `${pct}%`, background: "var(--grad)" }} />
                    </div>
                  </div>
                  <div className="row" style={{ marginTop: 14, position: "relative", zIndex: 2 }}>
                    <Link href={`/plan/${p.id}`} className="btn btn-sm">
                      Open
                    </Link>
                    <span className="spacer" />
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost btn-danger"
                      aria-label={`Delete ${p.plan.title}`}
                      onClick={() => {
                        if (!window.confirm(`Delete "${p.plan.title}"? This can't be undone.`)) return;
                        deletePlan(p.id);
                        toast("Plan deleted.", "success");
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </Tilt>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
