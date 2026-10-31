import { CARD_H, CARD_W, CX } from "../catalog";
import { type DesignProps, pick } from "../util";
import { StandardText } from "../layout";

/** Marigold toran: strands of beads hanging from a garland across the top. */
export function Toran({ p, r, text, facts }: DesignProps) {
  // Variation per seed: number of strands, how deep the garland dips, bead colours.
  const n = 7 + Math.floor(r() * 5);
  const dip = 30 + r() * 70;
  const beads = pick(r, [
    [p.accent, p.accent2],
    ["#ff9f1c", "#ffd166"],
    ["#e63946", "#ffd166"],
    [p.accent2, "#ffffff"],
  ]);
  const els: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = 60 + (i * (CARD_W - 120)) / (n - 1);
    const sag = Math.sin((i / (n - 1)) * Math.PI) * dip;
    const len = 90 + r() * 140;
    els.push(
      <line
        key={`s${i}`}
        x1={x}
        y1={40 + sag}
        x2={x}
        y2={40 + sag + len}
        stroke={p.accent}
        strokeWidth={2}
      />,
    );
    for (let b = 0; b < Math.floor(len / 34); b++)
      els.push(<circle key={`b${i}-${b}`} cx={x} cy={60 + sag + b * 34} r={13} fill={beads[b % 2]} />);
    els.push(
      <path
        key={`l${i}`}
        d={`M${x} ${40 + sag + len} q14 18 0 40 q-14 -22 0 -40Z`}
        fill="#4f9d69"
        opacity={0.9}
      />,
    );
  }
  return (
    <>
      <rect
        x={28}
        y={28}
        width={CARD_W - 56}
        height={CARD_H - 56}
        rx={18}
        fill="none"
        stroke={p.accent}
        strokeWidth={2}
        opacity={0.6}
      />
      <path d={`M40 40 Q${CX} 160 ${CARD_W - 40} 40`} fill="none" stroke={p.accent} strokeWidth={4} />
      {els}
      <StandardText p={p} text={text} facts={facts} top={450} />
    </>
  );
}
