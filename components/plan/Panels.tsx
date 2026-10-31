"use client";

import { CalendarX, Check, Hotel, Info, Pencil, Plus, Sparkles, Trash, WandSparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import PlaceList from "./PlaceList";
import { addDays, formatDate, todayIso } from "@/lib/format";
import { taskDate } from "@/lib/ics";
import {
  IDEA_CATEGORIES,
  type Custom,
  type Idea,
  type ScheduleItem,
  type StayPlan,
  type TimelineTask,
  type VendorItem,
  type VendorPick,
} from "@/lib/types";

const DETAIL_FIELDS = [
  ["theme", "Theme"],
  ["decor", "Decor"],
  ["food", "Food & drinks"],
  ["music", "Music & entertainment"],
  ["attire", "Dress code"],
] as const;

interface ScheduleProps {
  start: string;
  days: number;
  schedule: ScheduleItem[];
  onChange: (next: ScheduleItem[]) => void;
  /** Asks the AI to rework one function; resolves when the plan has been updated. */
  onReplan: (item: ScheduleItem, instruction: string) => Promise<void>;
  busy: boolean;
}

/** Each function as its own editable plan: details, edit in place, or re-plan with AI. */
export function SchedulePanel({ start, days, schedule, onChange, onReplan, busy }: ScheduleProps) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<ScheduleItem | null>(null);
  const [replan, setReplan] = useState<{ i: number; text: string } | null>(null);

  if (schedule.length === 0) {
    return (
      <section className="card empty">
        <div className="big" aria-hidden="true">
          <CalendarX size={40} strokeWidth={1.5} />
        </div>
        <h3>No functions planned yet</h3>
        <p className="muted">
          Add a function below, or use &ldquo;Refine with AI&rdquo; and ask for a day-by-day schedule.
        </p>
        <button type="button" className="btn btn-primary" onClick={() => startAdd(1)}>
          <Plus size={16} aria-hidden="true" /> Add a function
        </button>
      </section>
    );
  }

  function startEdit(i: number) {
    setReplan(null);
    setEditing(i);
    setDraft({ ...schedule[i] });
  }
  function startAdd(day: number) {
    const item: ScheduleItem = {
      day,
      time: "",
      title: "",
      details: "",
      theme: "",
      decor: "",
      food: "",
      music: "",
      attire: "",
    };
    onChange([...schedule, item].sort((a, b) => a.day - b.day));
    // The new item lands after the others on its day.
    const idx = [...schedule, item].sort((a, b) => a.day - b.day).lastIndexOf(item);
    setEditing(idx);
    setDraft({ ...item });
  }
  function save() {
    if (editing === null || !draft) return;
    if (!draft.title.trim()) return;
    onChange(schedule.map((s, n) => (n === editing ? { ...draft, title: draft.title.trim() } : s)));
    setEditing(null);
    setDraft(null);
  }
  function cancel() {
    // Cancelling a brand-new, still-empty function removes it.
    if (editing !== null && !schedule[editing].title) onChange(schedule.filter((_, n) => n !== editing));
    setEditing(null);
    setDraft(null);
  }
  const remove = (i: number) => {
    if (!window.confirm(`Remove "${schedule[i].title}" from the plan?`)) return;
    onChange(schedule.filter((_, n) => n !== i));
  };

  const totalDays = Math.max(days, ...schedule.map((s) => s.day));
  return (
    <div className="day-stack">
      {Array.from({ length: totalDays }, (_, d) => {
        const items = schedule.map((s, i) => ({ s, i })).filter(({ s }) => s.day === d + 1);
        return (
          <section key={d} aria-labelledby={`day-${d}`}>
            <div className="day-head">
              <span className="day-num">Day {d + 1}</span>
              <h3 className="m-0" id={`day-${d}`}>
                {formatDate(addDays(start, d))}
              </h3>
              <span className="spacer" />
              <button type="button" className="btn btn-ghost btn-sm no-print" onClick={() => startAdd(d + 1)}>
                <Plus size={14} aria-hidden="true" /> Add function
              </button>
            </div>
            {items.length === 0 && <p className="muted small">Nothing scheduled. A rest or travel day.</p>}
            <div className="fn-grid">
              {items.map(({ s, i }) =>
                editing === i && draft ? (
                  <form
                    key={i}
                    className="card fn-card"
                    onSubmit={(e) => {
                      e.preventDefault();
                      save();
                    }}
                    aria-label={`Edit ${s.title || "new function"}`}
                  >
                    <div className="grid-2">
                      <div>
                        <label htmlFor={`e-title-${i}`}>Function</label>
                        <input
                          id={`e-title-${i}`}
                          type="text"
                          required
                          maxLength={80}
                          value={draft.title}
                          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                        />
                      </div>
                      <div className="grid-2" style={{ gap: 10 }}>
                        <div>
                          <label htmlFor={`e-time-${i}`}>Time</label>
                          <input
                            id={`e-time-${i}`}
                            type="text"
                            maxLength={20}
                            placeholder="7:00 PM"
                            value={draft.time}
                            onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                          />
                        </div>
                        <div>
                          <label htmlFor={`e-guests-${i}`}>Guests</label>
                          <input
                            id={`e-guests-${i}`}
                            type="text"
                            inputMode="numeric"
                            value={draft.guests ?? ""}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                guests: Number(e.target.value.replace(/\D/g, "")) || undefined,
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <div className="field mt-12">
                      <label htmlFor={`e-details-${i}`}>About this function</label>
                      <textarea
                        id={`e-details-${i}`}
                        rows={2}
                        style={{ minHeight: 60 }}
                        maxLength={300}
                        value={draft.details}
                        onChange={(e) => setDraft({ ...draft, details: e.target.value })}
                      />
                    </div>
                    <div className="grid-2 mt-12">
                      {DETAIL_FIELDS.map(([k, label]) => (
                        <div key={k}>
                          <label htmlFor={`e-${k}-${i}`}>{label}</label>
                          <input
                            id={`e-${k}-${i}`}
                            type="text"
                            maxLength={200}
                            value={draft[k] ?? ""}
                            onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="row mt-16">
                      <button type="submit" className="btn btn-primary btn-sm">
                        <Check size={15} aria-hidden="true" /> Save
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <article key={i} className="card fn-card">
                    <div className="row" style={{ alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="slot-time">{s.time || "Time TBD"}</div>
                        <h3 style={{ margin: "2px 0 4px" }}>{s.title}</h3>
                      </div>
                      {!!s.guests && <span className="badge">{s.guests} guests</span>}
                    </div>
                    {s.details && <p className="notes m-0 mb-10">{s.details}</p>}
                    {DETAIL_FIELDS.some(([k]) => s[k]) && (
                      <dl className="fn-details">
                        {DETAIL_FIELDS.filter(([k]) => s[k]).map(([k, label]) => (
                          <div key={k}>
                            <dt>{label}</dt>
                            <dd>{s[k]}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {replan?.i === i ? (
                      <form
                        className="replan"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (!replan.text.trim()) return;
                          await onReplan(s, replan.text.trim());
                          setReplan(null);
                        }}
                      >
                        <label htmlFor={`rp-${i}`}>How should we rework {s.title}?</label>
                        <div className="row">
                          <input
                            id={`rp-${i}`}
                            type="text"
                            maxLength={200}
                            autoFocus
                            disabled={busy}
                            placeholder="e.g. Make it a poolside brunch with live folk music"
                            value={replan.text}
                            onChange={(e) => setReplan({ i, text: e.target.value })}
                            style={{ flex: 1, minWidth: 200 }}
                          />
                          <button
                            type="submit"
                            className="btn btn-primary btn-sm"
                            disabled={busy || !replan.text.trim()}
                          >
                            {busy ? "Re-planning…" : "Re-plan"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm btn-icon"
                            aria-label="Cancel"
                            disabled={busy}
                            onClick={() => setReplan(null)}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="row no-print" style={{ gap: 6, marginTop: 12 }}>
                        <button type="button" className="btn btn-sm" onClick={() => startEdit(i)}>
                          <Pencil size={14} aria-hidden="true" /> Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          disabled={busy}
                          onClick={() => {
                            setEditing(null);
                            setReplan({ i, text: "" });
                          }}
                        >
                          <WandSparkles size={14} aria-hidden="true" /> Re-plan with AI
                        </button>
                        <span className="spacer" />
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm btn-icon btn-danger"
                          aria-label={`Remove ${s.title}`}
                          onClick={() => remove(i)}
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    )}
                  </article>
                ),
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function StayPanel({ stay, city }: { stay: StayPlan; city: string }) {
  return (
    <section className="card" aria-labelledby="stay-h">
      <div className="row" style={{ marginBottom: 6 }}>
        <span className="icon-tile m-0" aria-hidden="true">
          <Hotel size={20} />
        </span>
        <h3 className="m-0" id="stay-h">
          Guest stays
        </h3>
        <span className="spacer" />
        {stay.costEstimate && <span className="badge badge-accent">{stay.costEstimate}</span>}
      </div>
      <p className="muted mt-10">{stay.summary}</p>
      {stay.where && (
        <p style={{ margin: "0 0 10px" }}>
          <strong>Where to book:</strong> {stay.where}
        </p>
      )}
      {stay.tips.length > 0 && (
        <ul className="notes" style={{ margin: "0 0 16px", paddingLeft: 18 }}>
          {stay.tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
      <PlaceList auto top={4} query={stay.searchQuery} city={city} />
    </section>
  );
}

export function TimelinePanel({
  eventDate,
  tasks,
  onToggle,
}: {
  eventDate: string;
  tasks: TimelineTask[];
  onToggle: (i: number) => void;
}) {
  const today = todayIso();
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className="card" aria-labelledby="tl-h">
      <div className="row mb-20">
        <h3 className="m-0" id="tl-h">
          Tasks
        </h3>
        <span className="spacer" />
        <span className="badge badge-ok" aria-live="polite">
          {done}/{tasks.length} done
        </span>
      </div>
      <ol className="tl">
        {tasks.map((t, i) => {
          const d = taskDate(eventDate, t.daysBefore);
          const overdue = !t.done && d < today;
          return (
            <li key={i} data-done={!!t.done}>
              <button
                type="button"
                className="tl-dot"
                role="checkbox"
                aria-checked={!!t.done}
                aria-label={`Mark "${t.task}" as ${t.done ? "not done" : "done"}`}
                onClick={() => onToggle(i)}
              >
                <Check size={15} strokeWidth={3} aria-hidden="true" />
              </button>
              <div className={`tl-when ${overdue ? "overdue" : ""}`}>
                {formatDate(d)} · {t.daysBefore === 0 ? "Event day" : `${t.daysBefore} days before`}
                {overdue && " · overdue"}
              </div>
              <div className="tl-task">{t.task}</div>
              <span className="badge mt-6">{t.owner}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Whether the server has a Google Places key (null while checking). */
function usePlacesConfigured(): boolean | null {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/places?status=1")
      .then((r) => r.json())
      .then((d) => setConfigured(!!d.configured))
      .catch(() => setConfigured(null));
  }, []);
  return configured;
}

function PlacesNotice({ city }: { city: string }) {
  return (
    <div className="alert alert-warn places-note" role="note">
      <Info className="flex-none" size={20} aria-hidden="true" />
      <div>
        <strong>Top-rated {city} vendors appear here automatically</strong> once Google Places is connected
        (set <code>GOOGLE_MAPS_API_KEY</code>). We only show real businesses from Google, never ones made up
        by AI. Until then, each vendor links to the same Google Maps search.
      </div>
    </div>
  );
}

interface VendorsProps {
  vendors: VendorItem[];
  city: string;
  /** e.g. "wedding", added to searches so a "Caterer" search finds wedding caterers. */
  occasion: string;
  onToggle: (i: number) => void;
  onShortlist: (i: number, next: VendorPick[]) => void;
}

/** What to book, what to ask, and real local businesses with contact details. */
export function VendorsPanel({ vendors, city, occasion, onToggle, onShortlist }: VendorsProps) {
  const booked = vendors.filter((v) => v.done).length;
  const configured = usePlacesConfigured();
  const ordered = vendors
    .map((v, i) => ({ v, i }))
    .sort((a, b) => (a.v.priority === b.v.priority ? 0 : a.v.priority === "must" ? -1 : 1));
  return (
    <div className="stack">
      <div className="row">
        <p className="muted small m-0">
          The top-rated {city} businesses for each vendor, ready to call. Shortlist the ones you like.
        </p>
        <span className="spacer" />
        <span className="badge badge-ok" aria-live="polite">
          {booked}/{vendors.length} booked
        </span>
      </div>
      {configured === false && <PlacesNotice city={city} />}
      {ordered.map(({ v, i }) => (
        <section key={i} className="card vendor-card" data-done={!!v.done} aria-label={v.category}>
          <div className="vendor">
            <button
              type="button"
              className="check"
              role="checkbox"
              aria-checked={!!v.done}
              aria-label={`${v.category} booked`}
              onClick={() => onToggle(i)}
            >
              <Check size={15} strokeWidth={3} aria-hidden="true" />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row gap-8">
                <span className="vendor-name" style={{ fontWeight: 600 }}>
                  {v.category}
                </span>
                <span className={`badge ${v.priority === "must" ? "badge-accent" : ""}`}>
                  {v.priority === "must" ? "Must-have" : "Nice to have"}
                </span>
              </div>
              <div className="notes" style={{ marginTop: 4 }}>
                <span className="faint">Ask:</span> {v.questions}
              </div>
              <div style={{ marginTop: 12 }}>
                <PlaceList
                  auto
                  top={4}
                  query={`${v.category} for ${occasion}`}
                  city={city}
                  shortlist={v.shortlist}
                  onShortlist={(next) => onShortlist(i, next)}
                />
              </div>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

interface IdeasProps {
  ideas: Idea[];
  customs: Custom[];
  onMore: (focus: string) => Promise<void>;
  busy: boolean;
}

export function IdeasPanel({ ideas, customs, onMore, busy }: IdeasProps) {
  const [filter, setFilter] = useState("All");
  const cats = [
    "All",
    ...IDEA_CATEGORIES.filter((c) => ideas.some((i) => (i.category || "Guest experience") === c)),
  ];
  const shown = ideas.filter((i) => filter === "All" || (i.category || "Guest experience") === filter);
  return (
    <div className="stack">
      <section aria-labelledby="ideas-h">
        <div className="row mb-14">
          <h3 className="m-0" id="ideas-h">
            Ideas for your celebration <span className="faint small">({ideas.length})</span>
          </h3>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-primary btn-sm no-print"
            disabled={busy}
            onClick={() => onMore(filter === "All" ? "" : filter)}
          >
            <Sparkles size={15} aria-hidden="true" />{" "}
            {busy ? "Thinking…" : filter === "All" ? "More ideas" : `More ${filter.toLowerCase()} ideas`}
          </button>
        </div>
        <div className="chips no-print mb-16" role="radiogroup" aria-label="Filter ideas">
          {cats.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={filter === c}
              className="chip"
              onClick={() => setFilter(c)}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="idea-grid">
          {shown.map((idea, i) => (
            <article key={idea.title + i} className="card card-hover">
              <div className="idea-num">{idea.category || "Idea"}</div>
              <h3>{idea.title}</h3>
              <p className="muted m-0">{idea.description}</p>
            </article>
          ))}
        </div>
      </section>
      {customs.length > 0 && (
        <section aria-labelledby="customs-h" style={{ marginTop: 32 }}>
          <h3 id="customs-h">Customs & rituals to plan for</h3>
          <div className="idea-grid">
            {customs.map((c, i) => (
              <div key={i} className="card">
                <div className="idea-num">Tradition</div>
                <h3>{c.name}</h3>
                <p className="muted m-0">{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
