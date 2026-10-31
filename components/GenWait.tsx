"use client";

import { CalendarDays, Check, Hotel, Lightbulb, MapPin, Users, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { EVENT_META } from "@/lib/events";
import { daysUntil, formatDateRange, formatINR } from "@/lib/format";
import { tipsFor } from "@/lib/tips";
import type { PlanInput } from "@/lib/types";

const STEPS = [
  "Reading your brief",
  "Balancing the budget",
  "Planning each function",
  "Choosing venue types",
  "Writing your task list",
  "Dreaming up ideas",
];

/**
 * Shown while the plan is generated (10–30s). Instead of a bare spinner it
 * plays back the brief we're planning from, and rotates practical tips for this
 * occasion, so the wait is useful.
 */
export default function GenWait({ input }: { input: PlanInput }) {
  const [step, setStep] = useState(0);
  const [tip, setTip] = useState(0);
  const tips = tipsFor(input.eventType, input.date + input.city);
  const meta = EVENT_META[input.eventType];
  const days = daysUntil(input.date);

  useEffect(() => {
    const s = setInterval(() => setStep((x) => Math.min(STEPS.length - 1, x + 1)), 3200);
    const t = setInterval(() => setTip((x) => (x + 1) % tips.length), 6000);
    return () => {
      clearInterval(s);
      clearInterval(t);
    };
  }, [tips.length]);

  const facts: [React.ComponentType<{ size?: number }>, string][] = [
    [CalendarDays, `${formatDateRange(input.date, input.days)} · ${days} days to go`],
    [MapPin, input.city],
    [Users, `${input.guests} guests`],
    [
      Wallet,
      `${formatINR(input.budget)} (${formatINR(Math.round(input.budget / Math.max(1, input.guests)))} per guest)`,
    ],
  ];
  if (input.stay)
    facts.push([
      Hotel,
      `${input.stay.rooms} rooms × ${input.stay.nights} night${input.stay.nights > 1 ? "s" : ""}`,
    ]);

  return (
    <div className="gen-wait" role="status" aria-live="polite">
      <div className="gen-head">
        <div className="orb" aria-hidden="true" />
        <div>
          <span className="eyebrow">Planning in progress</span>
          <h2 style={{ margin: "4px 0 0" }}>{input.title || `Your ${meta.label.toLowerCase()}`}</h2>
          <p className="muted m-0">
            This takes about 15–30 seconds. Here&apos;s what we&apos;re working with.
          </p>
        </div>
      </div>

      <div className="gen-grid">
        <section className="card" aria-label="Your brief">
          <h3>Your brief</h3>
          <ul className="brief-list">
            {facts.map(([Icon, text]) => (
              <li key={text}>
                <Icon size={17} />
                {text}
              </li>
            ))}
          </ul>
          {input.functions && input.functions.length > 0 && (
            <>
              <div className="label mt-16">Functions</div>
              <div className="chips">
                {input.functions.map((f, i) => (
                  <span key={i} className="badge">
                    Day {f.day} · {f.name}
                  </span>
                ))}
              </div>
            </>
          )}
          {input.style && (
            <p className="muted small" style={{ marginTop: 14, marginBottom: 0 }}>
              Style: {input.style}
            </p>
          )}
        </section>

        <section className="card" aria-label="Progress">
          <h3>What we&apos;re doing</h3>
          <ol className="gen-steps" style={{ margin: "8px 0 0" }}>
            {STEPS.map((s, i) => (
              <li key={s} data-state={i < step ? "done" : i === step ? "active" : "todo"}>
                <span className="gen-dot" aria-hidden="true">
                  {i < step ? <Check size={13} strokeWidth={3} /> : null}
                </span>
                {s}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card tip-card" aria-label="Planning tip">
        <span className="icon-tile" aria-hidden="true" style={{ marginBottom: 0 }}>
          <Lightbulb size={20} />
        </span>
        <div>
          <div className="eyebrow">
            Planner&apos;s tip {tip + 1} of {tips.length}
          </div>
          <p key={tip} className="tip-text">
            {tips[tip]}
          </p>
        </div>
      </section>
    </div>
  );
}
