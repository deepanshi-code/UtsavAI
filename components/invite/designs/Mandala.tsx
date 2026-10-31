import { CARD_H, CARD_W, CX } from "../catalog";
import type { DesignProps } from "../util";
import { StandardText } from "../layout";

/** Concentric rings of petals forming a mandala above the classic centred text. */
export function Mandala({ p, r, text, facts }: DesignProps) {
  const rings = 4 + Math.floor(r() * 3);
  const items: React.ReactNode[] = [];
  for (let k = 0; k < rings; k++) {
    const radius = 62 + k * (30 + r() * 8);
    const n = 8 + Math.floor(r() * 4) * 4;
    const size = 12 + r() * 14;
    const color = k % 2 ? p.accent : p.accent2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      items.push(
        k % 3 === 2 ? (
          <circle key={`${k}-${i}`} cx={x} cy={y} r={size / 4} fill={color} opacity={0.85} />
        ) : (
          <path
            key={`${k}-${i}`}
            d={`M0 ${-size} Q${size * 0.55} 0 0 ${size} Q${-size * 0.55} 0 0 ${-size}Z`}
            transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            opacity={0.9}
          />
        ),
      );
    }
    items.push(
      <circle
        key={`ring-${k}`}
        r={radius + size + 8}
        fill="none"
        stroke={p.accent}
        strokeWidth={1.2}
        strokeDasharray={k % 2 ? "2 10" : "none"}
        opacity={0.45}
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
      <g transform={`translate(${CX} 270)`}>
        <circle r={46} fill={p.accent} opacity={0.9} />
        <circle r={30} fill={p.bg} />
        <circle r={14} fill={p.accent2} />
        {items}
      </g>
      <StandardText p={p} text={text} facts={facts} top={540} />
    </>
  );
}
