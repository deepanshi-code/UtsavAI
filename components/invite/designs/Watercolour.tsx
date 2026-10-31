import { CARD_H, CARD_W } from "../catalog";
import { CAPS, SCRIPT, SERIF } from "../fonts";
import type { DesignProps } from "../util";
import { Flow } from "../layout";
import { GiftMotif } from "../ornaments";

/** Soft watercolour washes, confetti, a gift motif and a big gold script title. */
export function Watercolour({ p, r, text, facts, uid }: DesignProps) {
  const washes = ["#f7c6b5", "#bfe0ef", "#f9e3a6", "#cfe8d6", "#e7c8ea"];
  const confetti = ["#e8a87c", "#7fb3d9", "#f2c14e", "#e57f9a", "#86c5a4"];
  return (
    <>
      {/* Soft-edged radial gradients rather than a blur filter: same look, a fraction of the render time. */}
      <defs>
        {washes.map((c, i) => (
          <radialGradient key={c} id={`${uid}wash${i}`}>
            <stop offset="0" stopColor={c} stopOpacity={0.85} />
            <stop offset="0.6" stopColor={c} stopOpacity={0.45} />
            <stop offset="1" stopColor={c} stopOpacity={0} />
          </radialGradient>
        ))}
      </defs>
      <g>
        {Array.from({ length: 9 }, (_, i) => {
          const corner = i % 4;
          const x = corner % 2 ? CARD_W - r() * 300 : r() * 300;
          const y = corner < 2 ? r() * 320 : CARD_H - r() * 320;
          return (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx={260 + r() * 140}
              ry={200 + r() * 120}
              fill={`url(#${uid}wash${i % washes.length})`}
            />
          );
        })}
      </g>
      {Array.from({ length: 46 }, (_, i) => {
        let x = r() * CARD_W;
        const y = r() * CARD_H;
        if (x > 230 && x < CARD_W - 230 && y > 180 && y < CARD_H - 140)
          x = r() < 0.5 ? r() * 210 : CARD_W - r() * 210;
        const c = confetti[i % confetti.length];
        return i % 3 ? (
          <circle key={i} cx={x} cy={y} r={4 + r() * 6} fill={c} opacity={0.8} />
        ) : (
          <rect
            key={i}
            x={x}
            y={y}
            width={10}
            height={22}
            rx={3}
            fill={c}
            opacity={0.8}
            transform={`rotate(${r() * 360} ${x} ${y})`}
          />
        );
      })}
      <Flow
        top={230}
        center
        bottom={CARD_H - 120}
        width={760}
        items={[
          {
            kind: "text",
            text: text.headline.toUpperCase(),
            font: CAPS,
            size: 26,
            spacing: 5,
            fill: p.ink,
            gap: 0,
            factor: 0.7,
            maxLines: 2,
          },
          {
            kind: "text",
            text: text.names,
            font: SCRIPT,
            size: 120,
            fill: p.accent,
            gap: 140,
            factor: 0.42,
            maxLines: 2,
          },
          { kind: "text", text: facts.dates, font: SERIF, size: 40, spacing: 2, fill: p.ink, gap: 90 },
          { kind: "art", gap: 36, h: 120, draw: (y, s) => <GiftMotif p={p} y={y + 50 * s} s={s} /> },
          { kind: "text", text: text.body, font: SERIF, size: 32, fill: p.ink, gap: 70, maxLines: 4 },
          {
            kind: "text",
            text: [facts.time, facts.venue].filter(Boolean).join("  |  "),
            font: SERIF,
            size: 30,
            fill: p.ink,
            gap: 60,
            maxLines: 2,
          },
          {
            kind: "text",
            text: text.details,
            font: SERIF,
            size: 27,
            italic: true,
            fill: p.ink,
            opacity: 0.85,
            gap: 46,
            maxLines: 3,
          },
          {
            kind: "text",
            text: text.closing,
            font: SCRIPT,
            size: 62,
            fill: p.ink,
            gap: 86,
            factor: 0.42,
            maxLines: 2,
          },
          {
            kind: "text",
            text: facts.hosts ? `– ${facts.hosts}` : "",
            font: SERIF,
            size: 28,
            italic: true,
            fill: p.ink,
            gap: 54,
          },
          {
            kind: "text",
            text: facts.rsvp ? `RSVP · ${facts.rsvp}` : "",
            font: CAPS,
            size: 20,
            spacing: 2,
            fill: p.ink,
            opacity: 0.8,
            gap: 46,
          },
        ]}
      />
    </>
  );
}
