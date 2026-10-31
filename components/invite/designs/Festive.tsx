import { CARD_H, CARD_W, CX } from "../catalog";
import { CAPS, SCRIPT, SERIF } from "../fonts";
import { type DesignProps, pick } from "../util";
import { Flow } from "../layout";

/** Hanging lanterns, bunting, a diya, fireworks and a diya border; venue in a highlighted box. */
export function Festive({ p, r, text, facts }: DesignProps) {
  // Variation per seed: bunting order, lantern colour and where the fireworks burst.
  const flagBase = ["#f6c445", "#ff8a3d", "#2fb37a", "#3d8bff", "#e8457a"];
  const shift = Math.floor(r() * flagBase.length);
  const flagColours = flagBase.map((_, i) => flagBase[(i + shift) % flagBase.length]);
  const lanternColour = pick(r, [p.accent2, "#ff6f91", "#4fc3f7", "#ffd54f"]);
  const burstColours = [p.accent, p.accent2, "#ff7ab6", "#7fd1c4"];
  const bursts = Array.from({ length: 4 + Math.floor(r() * 3) }, (_, i) => ({
    x: i % 2 ? CARD_W - 110 - r() * 120 : 110 + r() * 120,
    y: 260 + r() * 720,
    s: 60 + r() * 60,
    c: pick(r, burstColours),
  }));
  const burst = (x: number, y: number, s: number, c: string) => (
    <g opacity={0.55}>
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return (
          <line
            key={i}
            x1={x + Math.cos(a) * s * 0.25}
            y1={y + Math.sin(a) * s * 0.25}
            x2={x + Math.cos(a) * s}
            y2={y + Math.sin(a) * s}
            stroke={c}
            strokeWidth={3}
            strokeLinecap="round"
          />
        );
      })}
      {Array.from({ length: 16 }, (_, i) => {
        const a = ((i + 0.5) / 16) * Math.PI * 2;
        return (
          <circle
            key={`d${i}`}
            cx={x + Math.cos(a) * s * 1.12}
            cy={y + Math.sin(a) * s * 1.12}
            r={4}
            fill={c}
          />
        );
      })}
    </g>
  );
  const lantern = (x: number, len: number) => (
    <g>
      <line x1={x} y1={0} x2={x} y2={len} stroke={p.accent} strokeWidth={2} />
      <path
        d={`M${x - 34} ${len + 18} L${x} ${len} L${x + 34} ${len + 18} L${x + 26} ${len + 96} L${x - 26} ${len + 96} Z`}
        fill={lanternColour}
      />
      <path d={`M${x - 34} ${len + 18} L${x + 34} ${len + 18}`} stroke={p.accent} strokeWidth={6} />
      <rect x={x - 26} y={len + 50} width={52} height={10} fill={p.accent} />
      {[-14, -5, 5, 14].map((dx) => (
        <line
          key={dx}
          x1={x + dx}
          y1={len + 96}
          x2={x + dx * 1.3}
          y2={len + 150}
          stroke={p.accent}
          strokeWidth={3}
        />
      ))}
    </g>
  );
  const diya = (x: number, y: number, s: number) => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-40 0 Q0 40 40 0 Z" fill={p.accent} />
      <path d="M-46 -2 L46 -2" stroke={p.accent2} strokeWidth={6} strokeLinecap="round" />
      <path d="M0 -8 Q14 -36 0 -64 Q-14 -36 0 -8 Z" fill="#ffd36b" />
      <path d="M0 -14 Q7 -32 0 -48 Q-7 -32 0 -14 Z" fill="#ff8a3d" />
    </g>
  );
  return (
    <>
      {bursts.map((b, i) => (
        <g key={i}>{burst(b.x, b.y, b.s, b.c)}</g>
      ))}
      {/* bunting */}
      <path d={`M0 30 Q${CX} 110 ${CARD_W} 30`} fill="none" stroke={p.accent} strokeWidth={2} />
      {Array.from({ length: 13 }, (_, i) => {
        const x = 40 + i * 80;
        const t = x / CARD_W;
        const y = 30 + Math.sin(t * Math.PI) * 40;
        return (
          <path
            key={i}
            d={`M${x - 26} ${y} L${x + 26} ${y} L${x} ${y + 46} Z`}
            fill={flagColours[i % flagColours.length]}
          />
        );
      })}
      {lantern(110, 70 + r() * 20)}
      {lantern(CARD_W - 110, 70 + r() * 20)}
      {diya(CX, 270, 1.6)}
      {/* diya border */}
      <rect x={0} y={CARD_H - 70} width={CARD_W} height={70} fill={p.accent} opacity={0.9} />
      {Array.from({ length: 14 }, (_, i) => (
        <g key={i}>{diya(38 + i * 77, CARD_H - 30, 0.55)}</g>
      ))}
      <Flow
        top={380}
        center
        bottom={CARD_H - 110}
        width={800}
        items={[
          {
            kind: "text",
            text: text.headline,
            font: SCRIPT,
            size: 78,
            fill: p.accent,
            gap: 0,
            factor: 0.42,
            maxLines: 2,
          },
          { kind: "rule", style: "ornate", fill: p.accent, gap: 48 },
          {
            kind: "text",
            text: text.names,
            font: CAPS,
            size: 34,
            spacing: 3,
            fill: p.ink,
            gap: 62,
            factor: 0.68,
            maxLines: 2,
          },
          { kind: "text", text: text.body, font: SERIF, size: 34, fill: p.ink, gap: 62, maxLines: 4 },
          {
            kind: "text",
            text: text.details,
            font: SERIF,
            size: 27,
            italic: true,
            fill: p.ink,
            opacity: 0.85,
            gap: 48,
            maxLines: 3,
          },
          {
            kind: "box",
            gap: 64,
            fill: p.accent,
            items: [
              { kind: "text", text: "✦ Venue ✦", font: CAPS, size: 26, spacing: 3, fill: p.bg, gap: 30 },
              {
                kind: "text",
                text: facts.venue,
                font: SERIF,
                size: 32,
                weight: 600,
                fill: p.bg,
                gap: 44,
                maxLines: 2,
              },
              {
                kind: "text",
                text: [facts.dates, facts.time].filter(Boolean).join(" · "),
                font: SERIF,
                size: 30,
                fill: p.bg,
                gap: 42,
              },
            ],
          },
          {
            kind: "text",
            text: facts.hosts ? "✦ Invited by ✦" : "",
            font: CAPS,
            size: 24,
            spacing: 3,
            fill: p.accent2,
            gap: 62,
          },
          { kind: "text", text: facts.hosts, font: SERIF, size: 34, weight: 600, fill: p.accent, gap: 44 },
          {
            kind: "text",
            text: facts.rsvp ? `RSVP · ${facts.rsvp}` : "",
            font: SERIF,
            size: 26,
            fill: p.ink,
            gap: 44,
          },
          {
            kind: "text",
            text: text.closing,
            font: SCRIPT,
            size: 44,
            fill: p.accent2,
            gap: 58,
            factor: 0.42,
            maxLines: 2,
          },
        ]}
      />
    </>
  );
}
