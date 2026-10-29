"use client";

import { formatDate, todayIso } from "@/lib/format";
import { taskDate } from "@/lib/ics";
import type { Custom, Idea, TimelineTask, VendorItem } from "@/lib/types";
import Tilt from "../Tilt";

export function TimelinePanel({ eventDate, tasks, onToggle }: { eventDate: string; tasks: TimelineTask[]; onToggle: (i: number) => void }) {
  const today = todayIso();
  const done = tasks.filter((t) => t.done).length;
  return (
    <section className="card" aria-labelledby="tl-h">
      <div className="row" style={{ marginBottom: 20 }}>
        <h3 id="tl-h" style={{ margin: 0 }}>Timeline</h3>
        <span className="spacer" />
        <span className="badge badge-ok" aria-live="polite">{done}/{tasks.length} done</span>
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
                ✓
              </button>
              <div className={`tl-when ${overdue ? "overdue" : ""}`}>
                {formatDate(d)} · {t.daysBefore === 0 ? "Event day 🎉" : `${t.daysBefore} days before`}
                {overdue && " · overdue"}
              </div>
              <div className="tl-task">{t.task}</div>
              <span className="badge" style={{ marginTop: 6 }}>{t.owner}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function VendorsPanel({ vendors, onToggle }: { vendors: VendorItem[]; onToggle: (i: number) => void }) {
  const booked = vendors.filter((v) => v.done).length;
  const groups: { title: string; items: { v: VendorItem; i: number }[] }[] = [
    { title: "Must-haves", items: vendors.map((v, i) => ({ v, i })).filter(({ v }) => v.priority === "must") },
    { title: "Nice to have", items: vendors.map((v, i) => ({ v, i })).filter(({ v }) => v.priority === "nice") },
  ];
  return (
    <div className="stack">
      <div className="row">
        <span className="spacer" />
        <span className="badge badge-ok" aria-live="polite">{booked}/{vendors.length} booked</span>
      </div>
      <div className="two-col">
        {groups.filter((g) => g.items.length).map((g) => (
          <section key={g.title} className="card" aria-label={g.title}>
            <h3>{g.title}</h3>
            {g.items.map(({ v, i }) => (
              <div className="vendor" key={i} data-done={!!v.done}>
                <button
                  type="button"
                  className="check"
                  role="checkbox"
                  aria-checked={!!v.done}
                  aria-label={`${v.category} booked`}
                  onClick={() => onToggle(i)}
                >
                  ✓
                </button>
                <div>
                  <div className="vendor-name" style={{ fontWeight: 600 }}>{v.category}</div>
                  <div className="notes" style={{ marginTop: 2 }}><span className="faint">Ask:</span> {v.questions}</div>
                </div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

export function IdeasPanel({ ideas, customs }: { ideas: Idea[]; customs: Custom[] }) {
  return (
    <div className="stack">
      <section aria-labelledby="ideas-h">
        <h3 id="ideas-h">Personalised ideas</h3>
        <div className="idea-grid">
          {ideas.map((idea, i) => (
            <Tilt key={i} className="card card-hover">
              <div className="pop-sm">
                <div className="idea-num">IDEA {String(i + 1).padStart(2, "0")}</div>
                <h3>{idea.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{idea.description}</p>
              </div>
            </Tilt>
          ))}
        </div>
      </section>
      {customs.length > 0 && (
        <section aria-labelledby="customs-h" style={{ marginTop: 32 }}>
          <h3 id="customs-h">Customs & rituals to plan for</h3>
          <div className="idea-grid">
            {customs.map((c, i) => (
              <div key={i} className="card">
                <div className="idea-num">🪔 TRADITION</div>
                <h3>{c.name}</h3>
                <p className="muted" style={{ margin: 0 }}>{c.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
