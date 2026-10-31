import { CARD_H, CARD_W, CX } from "../catalog";
import { CAPS, SCRIPT, SERIF } from "../fonts";
import { dateParts, type DesignProps, monogram, pick } from "../util";
import { Flow } from "../layout";
import { Flower, Leaf, Rose } from "../ornaments";

/** Palace arch with columns, a floral monogram wreath and lush florals at the base. */
export function Royal({ p, r, text, facts, uid }: DesignProps) {
  const d = dateParts(facts.iso);
  const leafGreen = pick(r, ["#6f8f5e", "#557a5a", "#8a9a5b"]);
  const bloom = pick(r, [
    [p.accent2, "#f4b6c2", "#e98aa0", "#f7d9a8"], // blush pinks
    ["#ffffff", "#f7e1c8", "#f2c2a0", "#e9b7c3"], // ivory and peach
    ["#c43b4b", "#e8737f", "#f4b6c2", "#ffd7a8"], // red roses
  ]);
  const cluster = (cx: number, cy: number, dir: number) =>
    Array.from({ length: 14 }, (_, i) => {
      const x = cx + dir * r() * 230;
      const y = cy - r() * 210;
      return i % 3 === 0 ? (
        <Leaf key={i} x={x} y={y} len={60 + r() * 50} angle={dir > 0 ? -20 - r() * 70 : 200 + r() * 70} fill={leafGreen} />
      ) : (
        <Rose key={i} x={x} y={y} size={20 + r() * 26} fill={bloom[i % bloom.length]} dark={p.accent} />
      );
    });
  return (
    <>
      <defs>
        <radialGradient id={`${uid}glow`} cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.7} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={CARD_W} height={CARD_H} fill={`url(#${uid}glow)`} />
      {/* columns and arch */}
      <g fill="none" stroke={p.accent} strokeWidth={3} opacity={0.55}>
        <path d={`M110 ${CARD_H} V420 Q110 120 ${CX} 90 Q${CARD_W - 110} 120 ${CARD_W - 110} 420 V${CARD_H}`} />
        <path d={`M140 ${CARD_H} V430 Q140 155 ${CX} 125 Q${CARD_W - 140} 155 ${CARD_W - 140} 430 V${CARD_H}`} strokeWidth={1.5} />
        {[70, CARD_W - 70].map((x) => (
          <g key={x}>
            <rect x={x - 26} y={360} width={52} height={CARD_H - 360} />
            <rect x={x - 36} y={340} width={72} height={22} />
            {[0, 1, 2].map((k) => <line key={k} x1={x - 14 + k * 14} x2={x - 14 + k * 14} y1={370} y2={CARD_H} strokeWidth={1} />)}
          </g>
        ))}
      </g>
      {/* monogram wreath */}
      <g>
        <circle cx={CX} cy={230} r={112} fill="none" stroke={leafGreen} strokeWidth={2} opacity={0.5} />
        {Array.from({ length: 22 }, (_, i) => {
          const a = (i / 22) * Math.PI * 2;
          const x = CX + Math.cos(a) * 112;
          const y = 230 + Math.sin(a) * 112;
          return i % 2 ? <Leaf key={i} x={x} y={y} len={36} angle={(a * 180) / Math.PI + 90} fill={leafGreen} /> : <Flower key={i} x={x} y={y} size={13 + r() * 6} fill={bloom[i % bloom.length]} centre={p.accent} rot={r() * 72} />;
        })}
        <text x={CX} y={262} textAnchor="middle" fontFamily={SCRIPT} fontSize={96} fill={p.accent}>{monogram(text.names)}</text>
      </g>
      {cluster(40, CARD_H - 20, 1)}
      {cluster(CARD_W - 40, CARD_H - 20, -1)}
      <Flow
        top={440}
        bottom={CARD_H - 150}
        width={700}
        items={[
          { kind: "text", text: text.headline.toUpperCase(), font: CAPS, size: 26, spacing: 6, fill: p.accent, gap: 0 },
          { kind: "text", text: text.names, font: SCRIPT, size: 108, fill: p.ink, gap: 112, factor: 0.42, maxLines: 2 },
          { kind: "rule", style: "ornate", fill: p.accent, gap: 50 },
          facts.multiDay
            ? { kind: "text", text: facts.dates.toUpperCase(), font: CAPS, size: 30, spacing: 4, fill: p.accent, gap: 58 }
            : { kind: "text", text: `${d.day}  |  ${d.month}  |  ${d.year}`, font: CAPS, size: 30, spacing: 4, fill: p.accent, gap: 58 },
          { kind: "text", text: text.body, font: SERIF, size: 34, fill: p.ink, gap: 62, maxLines: 4 },
          { kind: "text", text: [facts.time, facts.venue].filter(Boolean).join(" · "), font: SERIF, size: 32, weight: 600, fill: p.ink, gap: 64, maxLines: 2 },
          { kind: "text", text: text.details, font: SERIF, size: 26, italic: true, fill: p.ink, opacity: 0.85, gap: 48, maxLines: 3 },
          { kind: "text", text: text.closing, font: SCRIPT, size: 48, fill: p.accent, gap: 72, factor: 0.42, maxLines: 2 },
          { kind: "text", text: facts.hosts ? `– ${facts.hosts}` : "", font: SERIF, size: 28, italic: true, fill: p.ink, gap: 50 },
          { kind: "text", text: facts.rsvp ? `RSVP · ${facts.rsvp}` : "", font: CAPS, size: 20, spacing: 2, fill: p.ink, opacity: 0.8, gap: 50 },
        ]}
      />
    </>
  );
}
