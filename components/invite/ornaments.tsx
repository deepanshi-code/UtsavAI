import { CX, type Palette } from "./catalog";

/* ───────────────────────── Shared ornaments ───────────────────────── */

export function Flower({ x, y, size, fill, centre, rot = 0, petals = 5 }: { x: number; y: number; size: number; fill: string; centre: string; rot?: number; petals?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse key={i} cx={0} cy={-size * 0.55} rx={size * 0.34} ry={size * 0.55} fill={fill} transform={`rotate(${(i * 360) / petals})`} />
      ))}
      <circle r={size * 0.24} fill={centre} />
    </g>
  );
}
export function Rose({ x, y, size, fill, dark }: { x: number; y: number; size: number; fill: string; dark: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={size} fill={fill} />
      {[0.78, 0.56, 0.34].map((k, i) => (
        <path key={i} d={`M${-size * k} 0 A ${size * k} ${size * k} 0 0 1 ${size * k * 0.9} ${-size * k * 0.2}`} fill="none" stroke={dark} strokeWidth={size * 0.09} opacity={0.55} transform={`rotate(${i * 70})`} />
      ))}
    </g>
  );
}
export function Leaf({ x, y, len, angle, fill }: { x: number; y: number; len: number; angle: number; fill: string }) {
  return <path d={`M0 0 Q ${len * 0.5} ${-len * 0.28} ${len} 0 Q ${len * 0.5} ${len * 0.28} 0 0 Z`} fill={fill} transform={`translate(${x} ${y}) rotate(${angle})`} />;
}

/** Small gift box with sprigs, centred at `y` (drawn inside the watercolour flow). */
export function GiftMotif({ p, y, s }: { p: Palette; y: number; s: number }) {
  return (
    <g opacity={0.92} transform={`translate(${CX} ${y}) scale(${s}) translate(${-CX} ${-y})`}>
      {[-1, 1].map((dir) => (
        <g key={dir}>
          {Array.from({ length: 5 }, (_, i) => <Leaf key={i} x={CX + dir * (70 + i * 16)} y={y + 30 - i * 6} len={34} angle={dir > 0 ? -20 - i * 12 : 200 + i * 12} fill={p.accent2} />)}
        </g>
      ))}
      <rect x={CX - 50} y={y - 10} width={100} height={70} rx={6} fill={p.accent2} />
      <rect x={CX - 56} y={y - 22} width={112} height={18} rx={4} fill={p.accent2} />
      <rect x={CX - 7} y={y - 22} width={14} height={82} fill="#ffffff" opacity={0.85} />
      <path d={`M${CX} ${y - 22} q -40 -36 -10 -40 q 10 0 10 40 q 0 -40 10 -40 q 30 4 -10 40`} fill="none" stroke={p.ink} strokeWidth={3} />
    </g>
  );
}
