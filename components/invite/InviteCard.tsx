"use client";

import { forwardRef } from "react";
import type { InviteFacts, InviteText } from "@/lib/invite";

export const TEMPLATES = [
  { id: "mandala", label: "Mandala" },
  { id: "toran", label: "Marigold toran" },
  { id: "arch", label: "Mughal arch" },
  { id: "floral", label: "Floral corners" },
  { id: "paisley", label: "Paisley" },
  { id: "lotus", label: "Lotus" },
  { id: "minimal", label: "Minimal monogram" },
  { id: "confetti", label: "Confetti" },
] as const;
export type TemplateId = (typeof TEMPLATES)[number]["id"];

export const PALETTES = [
  { id: "maroon", label: "Maroon & gold", bg: "#5b1026", bg2: "#7a1834", ink: "#fbecd0", accent: "#e8b85a", accent2: "#f4d58d" },
  { id: "navy", label: "Navy & champagne", bg: "#14213d", bg2: "#1d3057", ink: "#f6ecd9", accent: "#d9b779", accent2: "#9ec5e8" },
  { id: "ivory", label: "Ivory & rose", bg: "#fbf4ea", bg2: "#f4e3d3", ink: "#4a2a3a", accent: "#d6457a", accent2: "#2a9d8f" },
  { id: "emerald", label: "Emerald & gold", bg: "#0f3d33", bg2: "#145347", ink: "#f4ecd4", accent: "#e2c275", accent2: "#9fe0c4" },
  { id: "pastel", label: "Pastel party", bg: "#fff4f8", bg2: "#e9f6ff", ink: "#3b2f5c", accent: "#ff7eb3", accent2: "#7ec8e3" },
  { id: "haldi", label: "Haldi yellow", bg: "#fff3c4", bg2: "#ffe08a", ink: "#4a3200", accent: "#b8720b", accent2: "#e8a317" },
  { id: "mehendi", label: "Mehendi green", bg: "#20402e", bg2: "#2c5a3f", ink: "#f3eccf", accent: "#d4b45c", accent2: "#9ccc65" },
  { id: "midnight", label: "Sangeet midnight", bg: "#1b1036", bg2: "#2b1b55", ink: "#f6ecff", accent: "#f2c14e", accent2: "#ff7ab6" },
  { id: "blush", label: "Blush & gold", bg: "#fdeef1", bg2: "#f8dbe2", ink: "#5a2234", accent: "#b8405e", accent2: "#c9a24a" },
] as const;
export type PaletteId = (typeof PALETTES)[number]["id"];
type Palette = (typeof PALETTES)[number];

export const CARD_W = 1080;
export const CARD_H = 1350;

/** Small seeded PRNG (mulberry32): the same seed always draws the same design. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Greedy word wrap by an approximate character budget (SVG text has no auto-wrap). */
export function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      if ((line + " " + word).trim().length > maxChars && line) {
        out.push(line);
        line = word;
      } else line = (line + " " + word).trim();
    }
    if (line) out.push(line);
  }
  return out;
}

function Mandala({ p, r }: { p: Palette; r: () => number }) {
  const rings = 4 + Math.floor(r() * 3);
  const items: React.ReactNode[] = [];
  for (let k = 0; k < rings; k++) {
    // Ring spacing is capped so the outermost ring (~250px) stays clear of the text below.
    const radius = 62 + k * (30 + r() * 8);
    const n = 8 + Math.floor(r() * 4) * 4;
    const size = 12 + r() * 14;
    const color = k % 2 ? p.accent : p.accent2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = Math.cos(a) * radius;
      const y = Math.sin(a) * radius;
      const deg = (a * 180) / Math.PI + 90;
      items.push(
        k % 3 === 2 ? (
          <circle key={`${k}-${i}`} cx={x} cy={y} r={size / 4} fill={color} opacity={0.85} />
        ) : (
          <path key={`${k}-${i}`} d={`M0 ${-size} Q${size * 0.55} 0 0 ${size} Q${-size * 0.55} 0 0 ${-size}Z`} transform={`translate(${x} ${y}) rotate(${deg})`} fill="none" stroke={color} strokeWidth={2.5} opacity={0.9} />
        ),
      );
    }
    items.push(<circle key={`ring-${k}`} r={radius + size + 8} fill="none" stroke={p.accent} strokeWidth={1.2} strokeDasharray={k % 2 ? "2 10" : "none"} opacity={0.45} />);
  }
  return (
    <g transform={`translate(${CARD_W / 2} 270)`}>
      <circle r={46} fill={p.accent} opacity={0.9} />
      <circle r={30} fill={p.bg} />
      <circle r={14} fill={p.accent2} />
      {items}
    </g>
  );
}

function Toran({ p, r }: { p: Palette; r: () => number }) {
  const n = 9;
  const els: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = 60 + (i * (CARD_W - 120)) / (n - 1);
    const sag = Math.sin((i / (n - 1)) * Math.PI) * 60;
    const len = 90 + r() * 140;
    els.push(<line key={`s${i}`} x1={x} y1={40 + sag} x2={x} y2={40 + sag + len} stroke={p.accent} strokeWidth={2} />);
    for (let b = 0; b < Math.floor(len / 34); b++) {
      els.push(<circle key={`b${i}-${b}`} cx={x} cy={60 + sag + b * 34} r={13} fill={b % 2 ? p.accent : p.accent2} />);
    }
    els.push(<path key={`l${i}`} d={`M${x} ${40 + sag + len} q14 18 0 40 q-14 -22 0 -40Z`} fill="#4f9d69" opacity={0.9} />);
  }
  return (
    <g>
      <path d={`M40 40 Q${CARD_W / 2} 160 ${CARD_W - 40} 40`} fill="none" stroke={p.accent} strokeWidth={4} />
      {els}
    </g>
  );
}

function Arch({ p, r }: { p: Palette; r: () => number }) {
  const stars = Array.from({ length: 22 }, (_, i) => {
    const x = 120 + r() * (CARD_W - 240);
    const y = 160 + r() * 260;
    const s = 4 + r() * 7;
    return <path key={i} d={`M${x} ${y - s} L${x + s * 0.3} ${y} L${x} ${y + s} L${x - s * 0.3} ${y}Z M${x - s} ${y} L${x} ${y - s * 0.3} L${x + s} ${y} L${x} ${y + s * 0.3}Z`} fill={p.accent2} opacity={0.5 + r() * 0.4} />;
  });
  const arch = (inset: number) =>
    `M${90 + inset} ${CARD_H - 90 - inset} V520 Q${90 + inset} 300 ${CARD_W / 2 - 120} 230 Q${CARD_W / 2} 170 ${CARD_W / 2} ${110 + inset} Q${CARD_W / 2} 170 ${CARD_W / 2 + 120} 230 Q${CARD_W - 90 - inset} 300 ${CARD_W - 90 - inset} 520 V${CARD_H - 90 - inset}`;
  return (
    <g>
      {stars}
      <path d={arch(0)} fill="none" stroke={p.accent} strokeWidth={4} />
      <path d={arch(18)} fill="none" stroke={p.accent} strokeWidth={1.5} opacity={0.6} />
      <circle cx={CARD_W / 2} cy={98} r={10} fill={p.accent} />
    </g>
  );
}

/** A five-petal flower; used by the floral corners. */
function Flower({ x, y, size, fill, centre, rot }: { x: number; y: number; size: number; fill: string; centre: string; rot: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {Array.from({ length: 5 }, (_, i) => (
        <ellipse key={i} cx={0} cy={-size * 0.55} rx={size * 0.32} ry={size * 0.55} fill={fill} opacity={0.9} transform={`rotate(${i * 72})`} />
      ))}
      <circle r={size * 0.22} fill={centre} />
    </g>
  );
}

function Floral({ p, r }: { p: Palette; r: () => number }) {
  // Clusters hug the four corners, leaving the centre column free for text.
  const corners: [number, number, number, number][] = [[70, 70, 1, 1], [CARD_W - 70, 70, -1, 1], [70, CARD_H - 70, 1, -1], [CARD_W - 70, CARD_H - 70, -1, -1]];
  return (
    <g>
      {corners.map(([cx, cy, sx, sy], c) => (
        <g key={c}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = 30 + r() * 150;
            const a = (r() * Math.PI) / 2;
            const x = cx + sx * Math.cos(a) * d;
            const y = cy + sy * Math.sin(a) * d;
            return (
              <g key={i}>
                <ellipse cx={x + sx * 26} cy={y + sy * 10} rx={26} ry={9} fill="#5f8f5a" opacity={0.75} transform={`rotate(${r() * 90 - 45} ${x} ${y})`} />
                <Flower x={x} y={y} size={18 + r() * 26} fill={i % 2 ? p.accent : p.accent2} centre={p.ink} rot={r() * 72} />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}

/** One paisley (mango) motif pointing right; scaled and mirrored by the caller. */
const PAISLEY = "M0 0 C 40 -60 120 -40 110 20 C 100 70 40 80 10 60 C -20 40 -10 10 0 0 Z";

function Paisley({ p, r }: { p: Palette; r: () => number }) {
  const n = 7;
  return (
    <g>
      <rect x={60} y={60} width={CARD_W - 120} height={190} rx={20} fill="none" stroke={p.accent} strokeWidth={2} opacity={0.6} />
      {Array.from({ length: n }, (_, i) => {
        const x = 110 + (i * (CARD_W - 260)) / (n - 1);
        const flip = i % 2 ? -1 : 1;
        const s = 0.75 + r() * 0.2;
        return (
          <g key={i} transform={`translate(${x} ${150}) scale(${flip * s} ${s})`}>
            <path d={PAISLEY} fill="none" stroke={i % 2 ? p.accent : p.accent2} strokeWidth={3} />
            <path d={PAISLEY} fill={i % 2 ? p.accent : p.accent2} opacity={0.18} transform="translate(20 10) scale(0.55)" />
            <circle cx={55} cy={18} r={5} fill={p.accent} />
          </g>
        );
      })}
      {[90, CARD_W - 90].map((x, i) => (
        <line key={i} x1={x} y1={280} x2={x} y2={CARD_H - 90} stroke={p.accent} strokeWidth={1.5} strokeDasharray="4 12" opacity={0.6} />
      ))}
    </g>
  );
}

function Lotus({ p, r }: { p: Palette; r: () => number }) {
  const cx = CARD_W / 2;
  const cy = 330;
  const layers = [
    { n: 9, len: 150, w: 34, c: p.accent2, o: 0.55 },
    { n: 7, len: 125, w: 34, c: p.accent, o: 0.75 },
    { n: 5, len: 95, w: 30, c: p.accent2, o: 0.95 },
  ];
  return (
    <g>
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${cx - 260 + i * 40} ${cy + 40 + i * 26} q 60 -14 120 0 t 120 0 t 120 0 t 120 0`} fill="none" stroke={p.accent} strokeWidth={2} opacity={0.35 + r() * 0.2} />
      ))}
      {layers.map((l, k) => (
        <g key={k}>
          {Array.from({ length: l.n }, (_, i) => {
            const a = -90 + (i - (l.n - 1) / 2) * (150 / l.n);
            return <path key={i} d={`M0 0 Q ${l.w} ${-l.len * 0.55} 0 ${-l.len} Q ${-l.w} ${-l.len * 0.55} 0 0 Z`} fill={l.c} opacity={l.o} transform={`translate(${cx} ${cy}) rotate(${a + 90})`} />;
          })}
        </g>
      ))}
      <ellipse cx={cx} cy={cy + 4} rx={60} ry={12} fill={p.accent} opacity={0.7} />
    </g>
  );
}

/** Thin double frame and a monogram of the main line's initials ("Riya & Arjun" → R & A). */
function Minimal({ p, names }: { p: Palette; names: string }) {
  const parts = names.split(/\s*(?:&|and|weds|\+)\s*/i).map((s) => s.trim()).filter(Boolean);
  const mono = parts.length >= 2 ? `${parts[0][0]} & ${parts[1][0]}` : (names.trim()[0] ?? "✦");
  return (
    <g>
      <rect x={70} y={70} width={CARD_W - 140} height={CARD_H - 140} fill="none" stroke={p.accent} strokeWidth={1.5} />
      <rect x={86} y={86} width={CARD_W - 172} height={CARD_H - 172} fill="none" stroke={p.accent} strokeWidth={0.75} opacity={0.6} />
      <circle cx={CARD_W / 2} cy={250} r={96} fill="none" stroke={p.accent} strokeWidth={1.5} />
      <text x={CARD_W / 2} y={272} textAnchor="middle" fontFamily={SERIF} fontStyle="italic" fontSize={58} fill={p.accent}>{mono.toUpperCase()}</text>
    </g>
  );
}

function Confetti({ p, r }: { p: Palette; r: () => number }) {
  const colors = [p.accent, p.accent2, "#ffd166", "#8ecae6", "#cdb4db"];
  const bits = Array.from({ length: 70 }, (_, i) => {
    // Keep the centre (where the text sits) mostly clear.
    let x = r() * CARD_W;
    const y = r() * CARD_H;
    if (x > 200 && x < CARD_W - 200 && y > 380 && y < CARD_H - 200) x = r() < 0.5 ? r() * 180 : CARD_W - r() * 180;
    const c = colors[i % colors.length];
    const rot = r() * 360;
    const kind = i % 4;
    return kind === 0 ? (
      <circle key={i} cx={x} cy={y} r={6 + r() * 8} fill={c} />
    ) : kind === 1 ? (
      <rect key={i} x={x} y={y} width={10 + r() * 10} height={22 + r() * 14} rx={4} fill={c} transform={`rotate(${rot} ${x} ${y})`} />
    ) : kind === 2 ? (
      <path key={i} d={`M${x} ${y} q12 -16 24 0 t24 0`} fill="none" stroke={c} strokeWidth={5} strokeLinecap="round" transform={`rotate(${rot} ${x} ${y})`} />
    ) : (
      <path key={i} d={`M${x} ${y - 12} L${x + 11} ${y + 9} L${x - 11} ${y + 9}Z`} fill={c} transform={`rotate(${rot} ${x} ${y})`} />
    );
  });
  return <g>{bits}</g>;
}

interface Props {
  template: TemplateId;
  palette: PaletteId;
  seed: number;
  text: InviteText;
  facts: InviteFacts;
}

interface Line {
  gap: number; // distance from the previous baseline, before scaling
  text?: string;
  divider?: boolean;
  font?: string;
  size: number;
  weight?: number;
  italic?: boolean;
  spacing?: number;
  fill?: string;
  opacity?: number;
}

/** Characters that fit across the text column at a given font size (rough average glyph width). */
const fit = (size: number, factor = 0.55) => Math.floor((CARD_W - 220) / (size * factor));

/**
 * Every line on the card, top to bottom, with its spacing. The facts (date,
 * time, venue, hosts, RSVP) come straight from the form, so they're always current.
 */
function layoutLines(text: InviteText, f: InviteFacts, p: Palette): Line[] {
  const out: Line[] = [];
  const add = (texts: string[], first: number, next: number, style: Omit<Line, "gap" | "text">) =>
    texts.forEach((t, i) => out.push({ gap: i === 0 ? first : next, text: t, ...style }));

  add([text.headline.toUpperCase()], 0, 0, { font: SANS, size: 30, spacing: 8, fill: p.accent });
  add(wrap(text.names, fit(78, 0.5)).slice(0, 2), 100, 86, { font: SERIF, size: 78, italic: true });
  out.push({ gap: 46, divider: true, size: 0 });
  add(wrap(text.body, fit(34)).slice(0, 5), 64, 46, { font: SERIF, size: 34 });
  add([f.dates], 78, 0, { font: SANS, size: 34, weight: 700, fill: p.accent });
  if (f.time) add([f.time], 48, 0, { font: SANS, size: 30, weight: 600 });
  add(wrap(f.venue, fit(30, 0.58)).slice(0, 2), 48, 42, { font: SANS, size: 30, weight: 600 });
  if (text.details) add(wrap(text.details, fit(26)).slice(0, 3), 58, 38, { font: SANS, size: 26, opacity: 0.85 });
  add(wrap(text.closing, fit(30)).slice(0, 2), 74, 42, { font: SERIF, size: 30, italic: true, opacity: 0.95 });
  if (f.hosts) add(wrap(`– ${f.hosts}`, fit(30)).slice(0, 2), 46, 40, { font: SERIF, size: 30 });
  if (f.rsvp) add(wrap(`RSVP · ${f.rsvp}`, fit(24, 0.6)).slice(0, 2), 58, 34, { font: SANS, size: 24, spacing: 1, opacity: 0.85 });
  return out;
}

const SERIF = "'Palatino Linotype', Palatino, Georgia, 'Nirmala UI', 'Noto Serif Devanagari', serif";
const SANS = "'Segoe UI', Arial, 'Nirmala UI', 'Noto Sans Devanagari', sans-serif";

/**
 * The invitation as a self-contained 1080×1350 SVG (Instagram portrait). It only
 * uses system fonts, because fonts don't load when the SVG is drawn to a canvas
 * for the PNG download, and the preview must match the download.
 */
const InviteCard = forwardRef<SVGSVGElement, Props>(function InviteCard({ template, palette, seed, text, facts }, ref) {
  const p = PALETTES.find((x) => x.id === palette) ?? PALETTES[0];
  const r = rng(seed);
  // Where the text starts, below each template's artwork.
  const top = { toran: 450, arch: 500, mandala: 540, floral: 330, paisley: 340, lotus: 450, minimal: 420, confetti: 440 }[template] ?? 440;
  const lines = layoutLines(text, facts, p);
  // Shrink everything uniformly if the content would run past the bottom margin.
  const natural = lines.reduce((h, l) => h + l.gap, 0);
  const scale = Math.min(1, (CARD_H - 95 - top) / Math.max(1, natural));
  let y = top;

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${CARD_W} ${CARD_H}`} width={CARD_W} height={CARD_H} role="img" aria-label={`Invitation: ${text.headline} ${text.names}`}>
      <defs>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bg} />
          <stop offset="1" stopColor={p.bg2} />
        </linearGradient>
      </defs>
      <rect width={CARD_W} height={CARD_H} fill="url(#bgGrad)" />
      <rect x={28} y={28} width={CARD_W - 56} height={CARD_H - 56} rx={18} fill="none" stroke={p.accent} strokeWidth={2} opacity={0.6} />
      {template === "mandala" && <Mandala p={p} r={r} />}
      {template === "toran" && <Toran p={p} r={r} />}
      {template === "arch" && <Arch p={p} r={r} />}
      {template === "confetti" && <Confetti p={p} r={r} />}
      {template === "floral" && <Floral p={p} r={r} />}
      {template === "paisley" && <Paisley p={p} r={r} />}
      {template === "lotus" && <Lotus p={p} r={r} />}
      {template === "minimal" && <Minimal p={p} names={text.names} />}

      <g textAnchor="middle" fill={p.ink}>
        {lines.map((l, i) => {
          y += l.gap * scale;
          if (l.divider) {
            const w = 90 * scale;
            return <path key={i} d={`M${CARD_W / 2 - w} ${y} h${w - 20 * scale} m${20 * scale} 0 a${6 * scale} ${6 * scale} 0 1 0 0.1 0 m${20 * scale} 0 h${w - 20 * scale}`} stroke={p.accent} strokeWidth={2} fill="none" />;
          }
          return (
            <text key={i} x={CARD_W / 2} y={y} fontFamily={l.font} fontSize={l.size * scale} fontWeight={l.weight} fontStyle={l.italic ? "italic" : undefined}
              letterSpacing={l.spacing ? l.spacing * scale : undefined} fill={l.fill} opacity={l.opacity}>
              {l.text}
            </text>
          );
        })}
      </g>
    </svg>
  );
});

export default InviteCard;

/** Renders the SVG to a PNG blob at full size. */
export async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Couldn't render the card"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    canvas.getContext("2d")!.drawImage(img, 0, 0, CARD_W, CARD_H);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG export failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
