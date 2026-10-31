import { CARD_H, CARD_W, CX } from "../catalog";
import { SANS, SCRIPT } from "../fonts";
import { dateParts, type DesignProps, pick } from "../util";
import { Flow, wrap } from "../layout";

/** Bright party card: hats, stars, streamers, a cloud badge and a three-column info bar. */
export function Party({ p, r, text, facts }: DesignProps) {
  const d = dateParts(facts.iso);
  // Variation per seed: hat colours and streamer colours.
  const hats = pick(r, [["#d6403d", "#2e9e53"], ["#7e57c2", "#ffb300"], ["#1e88e5", "#e91e63"], ["#00897b", "#f4511e"]]);
  const streamers = pick(r, [["#e0b33a", "#2e9e53", "#d6403d"], ["#e91e63", "#1e88e5", "#ffb300"], ["#7e57c2", "#00897b", "#f4511e"]]);
  const star = (x: number, y: number, s: number) => (
    <path d={Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5 - Math.PI / 2; const rr = i % 2 ? s * 0.45 : s; return `${i ? "L" : "M"}${x + Math.cos(a) * rr} ${y + Math.sin(a) * rr}`; }).join(" ") + "Z"} fill="#ffe066" stroke="#f4b740" strokeWidth={2} />
  );
  const hat = (x: number, y: number, rot: number, c: string) => (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M0 -150 L70 40 L-70 40 Z" fill={c} />
      {[-90, -40, 10].map((yy) => <path key={yy} d={`M${-((yy + 150) / 190) * 70} ${yy} L${((yy + 150) / 190) * 70} ${yy}`} stroke="#ffd447" strokeWidth={10} />)}
      <circle cy={-155} r={16} fill="#ffd447" />
    </g>
  );
  const streamer = (x: number, y: number, c: string) => <path d={`M${x} ${y} q 20 30 0 60 t 0 60 t 0 60`} fill="none" stroke={c} strokeWidth={6} strokeLinecap="round" />;
  const cloud = "M260 560 q-90 0 -90 -80 q0 -70 80 -80 q10 -90 110 -90 q60 -60 140 -30 q70 -50 150 10 q100 -10 120 80 q90 20 80 100 q0 70 -90 70 Z";
  return (
    <>
      {hat(250, 250, -28, hats[0])}
      {hat(CARD_W - 240, 250, 26, hats[1])}
      {streamer(170, 360, streamers[0])}
      {streamer(CARD_W - 170, 380, streamers[1])}
      {streamer(240, 640, streamers[2])}
      {streamer(CARD_W - 250, 650, streamers[0])}
      {[[230, 200], [CARD_W - 230, 200], [140, 520], [CARD_W - 140, 520], [330, 720], [CARD_W - 330, 720]].map(([x, y], i) => <g key={i}>{star(x + (r() - 0.5) * 80, y + (r() - 0.5) * 60, 22 + r() * 16)}</g>)}
      {Array.from({ length: 18 }, (_, i) => <circle key={i} cx={260 + r() * 560} cy={700 + r() * 60} r={7} fill="#e04f86" opacity={0.8} />)}
      {/* The cloud outline spans x≈170–850, so shift it to centre on the card. */}
      <g transform="translate(30 40)">
        <path d={cloud} fill="#bdbdbd" opacity={0.35} transform="translate(10 14)" />
        <path d={cloud} fill="#ffffff" />
      </g>
      {/* Title inside the cloud (outside the shifted group, so it stays on the card's centre line). */}
      <text x={CX} y={wrap(text.headline, 14).length > 1 ? 450 : 495} textAnchor="middle" fontFamily={SCRIPT} fontSize={wrap(text.headline, 14).length > 1 ? 70 : 96} fill={p.accent}>
        {wrap(text.headline, 14).slice(0, 2).map((t, i) => <tspan key={i} x={CX} dy={i ? 80 : 0}>{t}</tspan>)}
      </text>
      <text x={CX} y={135} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={46} fill={p.ink}>{wrap(text.names, 22)[0]}</text>
      <Flow
        top={810}
        center
        bottom={CARD_H - 90}
        width={800}
        items={[
          { kind: "text", text: text.body, font: SANS, size: 32, fill: p.ink, gap: 0, factor: 0.52, maxLines: 3 },
          {
            kind: "bar",
            gap: 30,
            fill: p.ink,
            ink: p.ink,
            left: facts.multiDay ? [d.month.slice(0, 3), facts.dates.split("–")[0].replace(/\D+$/, "")] : [d.month.slice(0, 3), d.day.replace(/^0/, "")],
            middle: [wrap(facts.venue, 24)[0] ?? "", wrap(facts.venue, 24)[1] ?? ""],
            right: [d.weekday, facts.time || "Time TBC"],
          },
          { kind: "rule", style: "dots", fill: "#e8505b", gap: 40 },
          { kind: "text", text: facts.rsvp ? `RSVP · ${facts.rsvp}` : text.closing, font: SANS, size: 34, weight: 600, fill: p.ink, gap: 62, factor: 0.55, maxLines: 2 },
          { kind: "text", text: facts.hosts ? `– ${facts.hosts}` : "", font: SANS, size: 24, fill: p.ink, opacity: 0.8, gap: 40 },
        ]}
      />
    </>
  );
}
