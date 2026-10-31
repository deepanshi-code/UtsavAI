import { Check } from "lucide-react";
import Tilt from "./Tilt";

const TASKS: [string, boolean][] = [
  ["Book the venue", true],
  ["Menu tasting", true],
  ["Mehendi artist", false],
  ["Send invitations", false],
  ["Sangeet playlist", false],
];

const SLICES: [string, number, number][] = [
  ["var(--accent)", 0, 34],
  ["var(--accent-2)", 34, 62],
  ["var(--accent-3)", 62, 84],
  ["rgba(var(--tint-rgb), 0.18)", 84, 100],
];

/**
 * The landing-page illustration: an open planner shown in perspective that
 * leans slightly toward the pointer (<Tilt>). Pure HTML/CSS, decorative only.
 */
export default function PlannerHero() {
  const r = 42;
  const C = 2 * Math.PI * r;
  return (
    <Tilt className="planner-scene" max={4} aria-hidden="true">
      <div className="planner-book">
        <div className="pl-page">
          <div className="pl-title">Riya &amp; Arjun</div>
          <div className="pl-meta">12–14 Feb · Jaipur · 250 guests</div>
          <ul className="pl-list">
            {TASKS.map(([task, done]) => (
              <li key={task} data-done={done}>
                <span className="pl-box">{done && <Check size={11} strokeWidth={3} />}</span>
                {task}
              </li>
            ))}
          </ul>
          <div className="pl-bar">
            <span />
          </div>
          <div className="pl-meta mt-6">2 of 5 done</div>
        </div>
        <div className="pl-spiral">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
        <div className="pl-page">
          <div className="pl-title" style={{ color: "var(--accent-2)" }}>
            Budget
          </div>
          <div className="pl-meta">₹12,00,000 allocated</div>
          <svg
            viewBox="0 0 120 120"
            width="112"
            height="112"
            style={{ display: "block", margin: "4px auto 8px" }}
          >
            {SLICES.map(([c, a, b]) => (
              <circle
                key={c}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={c}
                strokeWidth="16"
                strokeDasharray={`${((b - a) / 100) * C} ${C}`}
                strokeDashoffset={-(a / 100) * C}
                transform="rotate(-90 60 60)"
              />
            ))}
          </svg>
          <ul className="pl-list" style={{ fontSize: "0.72rem", gap: 3 }}>
            <li>
              <span className="swatch" style={{ background: "var(--accent)", width: 9, height: 9 }} />
              Venue &amp; catering
            </li>
            <li>
              <span className="swatch" style={{ background: "var(--accent-2)", width: 9, height: 9 }} />
              Decor &amp; flowers
            </li>
            <li>
              <span className="swatch" style={{ background: "var(--accent-3)", width: 9, height: 9 }} />
              Photography
            </li>
          </ul>
        </div>
      </div>
      <div className="pl-badge">
        <b>104</b>
        <span>days to go</span>
      </div>
    </Tilt>
  );
}
