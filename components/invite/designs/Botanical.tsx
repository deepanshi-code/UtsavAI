import { CARD_H, CX } from "../catalog";
import { CAPS, SCRIPT, SERIF } from "../fonts";
import { type DesignProps, pick } from "../util";
import { Flow, type Item } from "../layout";
import { Flower, Leaf } from "../ornaments";

/** Symmetrical vine arch of leaves and small white flowers on a muted ground. */
export function Botanical({ p, r, text, facts }: DesignProps) {
  // Variation per seed: flower colour and how densely flowers sit on the vine.
  const bloom = pick(r, [p.accent2, "#ffffff", "#f6c9d2", "#f9e3a6"]);
  const every = pick(r, [2, 3, 4]);
  const vine = (dir: 1 | -1) => {
    // Leaves and the stem share the same points, so the leaves sit on the vine.
    const pts = Array.from({ length: 22 }, (_, i) => {
      const t = i / 21;
      return { x: CX + dir * (60 + Math.sin(t * Math.PI) * 380), y: 90 + t * 1180, t };
    });
    const path = pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" ");
    return (
      <g>
        <path d={path} fill="none" stroke="#8c7a6b" strokeWidth={3} strokeLinejoin="round" opacity={0.75} />
        {pts.map(({ x, y }, i) => (
          <g key={i}>
            <Leaf x={x} y={y} len={46 + r() * 22} angle={dir > 0 ? -40 + r() * 30 : 220 - r() * 30} fill={p.accent} />
            <Leaf x={x} y={y} len={40 + r() * 20} angle={dir > 0 ? 30 + r() * 30 : 150 - r() * 30} fill={p.accent} />
            {i % every === 1 && <Flower x={x + dir * (r() * 30)} y={y} size={20 + r() * 6} fill={bloom} centre="#e7c46a" rot={r() * 72} />}
          </g>
        ))}
      </g>
    );
  };
  // "Riya & Arjun's wedding" → ["Riya", "Arjun"]: drop the possessive tail so the pair reads cleanly.
  const names = text.names.split(/\s*(?:&| and | weds )\s*/i).filter(Boolean).map((n, i, all) => (i === all.length - 1 ? n.replace(/'s\b.*$/i, "").trim() : n));
  const pair = names.length >= 2;
  return (
    <>
      {vine(1)}
      {vine(-1)}
      <Flow
        top={330}
        center
        bottom={CARD_H - 160}
        width={560}
        items={[
          { kind: "text", text: text.headline, font: SERIF, size: 34, italic: true, fill: p.ink, gap: 0, maxLines: 2 },
          ...(pair
            ? ([
                { kind: "text", text: names[0].toUpperCase(), font: CAPS, size: 58, spacing: 3, fill: p.ink, gap: 96, factor: 0.72, maxLines: 2 },
                { kind: "text", text: "and", font: SCRIPT, size: 56, fill: p.ink, gap: 68 },
                { kind: "text", text: names.slice(1).join(" & ").toUpperCase(), font: CAPS, size: 58, spacing: 3, fill: p.ink, gap: 76, factor: 0.72, maxLines: 2 },
              ] as Item[])
            : ([{ kind: "text", text: text.names.toUpperCase(), font: CAPS, size: 56, spacing: 3, fill: p.ink, gap: 96, factor: 0.72, maxLines: 3 }] as Item[])),
          { kind: "text", text: facts.dates, font: SCRIPT, size: 54, fill: p.ink, gap: 92, factor: 0.42 },
          { kind: "text", text: text.body, font: SERIF, size: 31, fill: p.ink, gap: 62, maxLines: 4 },
          { kind: "text", text: facts.time, font: SERIF, size: 31, fill: p.ink, gap: 56 },
          { kind: "text", text: facts.venue, font: SERIF, size: 31, fill: p.ink, gap: 44, maxLines: 2 },
          { kind: "text", text: text.details, font: SERIF, size: 27, italic: true, fill: p.ink, opacity: 0.85, gap: 50, maxLines: 3 },
          { kind: "text", text: text.closing, font: SERIF, size: 30, fill: p.ink, gap: 62, maxLines: 2 },
          { kind: "text", text: facts.hosts ? `– ${facts.hosts}` : "", font: SERIF, size: 28, italic: true, fill: p.ink, gap: 46 },
          { kind: "text", text: facts.rsvp ? `RSVP · ${facts.rsvp}` : "", font: SERIF, size: 24, spacing: 1, fill: p.ink, opacity: 0.8, gap: 46 },
        ]}
      />
    </>
  );
}
