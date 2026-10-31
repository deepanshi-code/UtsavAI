"use client";

import { forwardRef, useId } from "react";
import type { InviteFacts, InviteText } from "@/lib/invite";

/*
 * Invitation cards drawn as a self-contained 1080×1350 SVG (Instagram portrait).
 * Each design has its own artwork and text layout. Fonts are bundled (SIL OFL, see
 * public/fonts) and embedded into the SVG on export, so the PNG matches the preview.
 */

export const TEMPLATES = [
  { id: "royal", label: "Royal arch" },
  { id: "botanical", label: "Botanical vines" },
  { id: "festive", label: "Festive lights" },
  { id: "watercolour", label: "Watercolour" },
  { id: "party", label: "Party" },
  { id: "mandala", label: "Mandala" },
  { id: "toran", label: "Marigold toran" },
] as const;
export type TemplateId = (typeof TEMPLATES)[number]["id"];

/** Designs from earlier versions, mapped to their closest new design. */
const LEGACY: Record<string, TemplateId> = { arch: "royal", paisley: "royal", floral: "botanical", minimal: "botanical", lotus: "festive", confetti: "party" };
export const resolveTemplate = (id: string): TemplateId => (TEMPLATES.some((t) => t.id === id) ? (id as TemplateId) : LEGACY[id] ?? "royal");

export const PALETTES = [
  { id: "peach", label: "Peach & rose", bg: "#fbe9e0", bg2: "#f6d3c8", ink: "#6b1f2c", accent: "#9c2a3a", accent2: "#d98c9b" },
  { id: "maroon", label: "Maroon & gold", bg: "#5b1026", bg2: "#7a1834", ink: "#fbecd0", accent: "#e8b85a", accent2: "#f4d58d" },
  { id: "sage", label: "Sage & ivory", bg: "#d9dfd8", bg2: "#cfd7cf", ink: "#4d4a45", accent: "#6f8a6a", accent2: "#ffffff" },
  { id: "festive", label: "Diwali maroon", bg: "#6a0f1d", bg2: "#4a0912", ink: "#fff3d6", accent: "#f6c445", accent2: "#ff8a3d" },
  { id: "wash", label: "Pastel wash", bg: "#fffaf3", bg2: "#fdf3ea", ink: "#2f2a33", accent: "#b88a3b", accent2: "#7fb3d9" },
  { id: "candy", label: "Candy pink", bg: "#ffc4d6", bg2: "#ffe9c9", ink: "#4a3a3a", accent: "#a0522d", accent2: "#3aa655" },
  { id: "navy", label: "Navy & champagne", bg: "#14213d", bg2: "#1d3057", ink: "#f6ecd9", accent: "#d9b779", accent2: "#9ec5e8" },
  { id: "emerald", label: "Emerald & gold", bg: "#0f3d33", bg2: "#145347", ink: "#f4ecd4", accent: "#e2c275", accent2: "#9fe0c4" },
  { id: "haldi", label: "Haldi yellow", bg: "#fff3c4", bg2: "#ffe08a", ink: "#4a3200", accent: "#b8720b", accent2: "#e8a317" },
  { id: "mehendi", label: "Mehendi green", bg: "#20402e", bg2: "#2c5a3f", ink: "#f3eccf", accent: "#d4b45c", accent2: "#9ccc65" },
  { id: "midnight", label: "Sangeet midnight", bg: "#1b1036", bg2: "#2b1b55", ink: "#f6ecff", accent: "#f2c14e", accent2: "#ff7ab6" },
  { id: "blush", label: "Blush & gold", bg: "#fdeef1", bg2: "#f8dbe2", ink: "#5a2234", accent: "#b8405e", accent2: "#c9a24a" },
] as const;
export type PaletteId = (typeof PALETTES)[number]["id"];
type Palette = (typeof PALETTES)[number];
/** Palettes from earlier versions that no longer exist. */
const LEGACY_PALETTE: Record<string, PaletteId> = { ivory: "peach", pastel: "wash" };
export const resolvePalette = (id: string): PaletteId => (PALETTES.some((p) => p.id === id) ? (id as PaletteId) : LEGACY_PALETTE[id] ?? "peach");

export const CARD_W = 1080;
export const CARD_H = 1350;
const CX = CARD_W / 2;

// Bundled fonts (with system fallbacks for Devanagari and anything else they lack).
const SCRIPT = "'UV Script', 'Great Vibes', 'Segoe Script', 'Nirmala UI', cursive";
const SERIF = "'UV Serif', 'Cormorant Garamond', Georgia, 'Nirmala UI', 'Noto Serif Devanagari', serif";
const CAPS = "'UV Caps', Cinzel, Georgia, 'Nirmala UI', serif";
const SANS = "'Segoe UI', Arial, 'Nirmala UI', 'Noto Sans Devanagari', sans-serif";
const FONT_FILES = [
  ["UV Script", "/fonts/great-vibes-latin-400-normal.woff2", 400, "normal"],
  ["UV Serif", "/fonts/cormorant-garamond-latin-400-normal.woff2", 400, "normal"],
  ["UV Serif", "/fonts/cormorant-garamond-latin-400-italic.woff2", 400, "italic"],
  ["UV Serif", "/fonts/cormorant-garamond-latin-600-normal.woff2", 600, "normal"],
  ["UV Caps", "/fonts/cinzel-latin-400-normal.woff2", 400, "normal"],
  ["UV Caps", "/fonts/cinzel-latin-600-normal.woff2", 600, "normal"],
] as const;
const FONT_CSS = FONT_FILES.map(([fam, url, w, s]) => `@font-face{font-family:'${fam}';src:url('${url}') format('woff2');font-weight:${w};font-style:${s};}`).join("");

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

const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
function dateParts(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return { day: String(d.getUTCDate()).padStart(2, "0"), month: MONTHS[d.getUTCMonth()], year: String(d.getUTCFullYear()), weekday: DAYS[d.getUTCDay()] };
}
/** Initials for a monogram: "Riya & Arjun's wedding" → "RA". */
function monogram(names: string) {
  const parts = names.replace(/'s\b.*$/i, "").split(/\s*(?:&|and|weds|\+)\s*/i).map((s) => s.trim()).filter(Boolean);
  return (parts.length >= 2 ? parts[0][0] + parts[1][0] : (names.trim()[0] ?? "")).toUpperCase();
}

/* ───────────────────────── Text layout ───────────────────────── */

type Item =
  | { kind: "text"; text: string; font: string; size: number; gap: number; weight?: number; italic?: boolean; fill?: string; spacing?: number; opacity?: number; width?: number; maxLines?: number; factor?: number }
  | { kind: "rule"; gap: number; fill: string; style: "dots" | "ornate" | "line" }
  | { kind: "box"; gap: number; fill: string; stroke?: string; items: Item[] }
  | { kind: "bar"; gap: number; fill: string; ink: string; left: [string, string]; middle: [string, string]; right: [string, string] }
  /** A drawing that takes its place in the flow (e.g. the watercolour gift), `h` tall before scaling. */
  | { kind: "art"; gap: number; h: number; draw: (y: number, scale: number) => React.ReactNode };

const charsFor = (width: number, size: number, factor: number) => Math.max(8, Math.floor(width / (size * factor)));

/** Expands wrapped text items into one item per line. */
function expand(items: Item[], defaultWidth: number): Item[] {
  const out: Item[] = [];
  for (const it of items) {
    if (it.kind !== "text") {
      out.push(it.kind === "box" ? { ...it, items: expand(it.items, defaultWidth - 120) } : it);
      continue;
    }
    if (!it.text.trim()) continue;
    const lines = wrap(it.text, charsFor(it.width ?? defaultWidth, it.size, it.factor ?? 0.5)).slice(0, it.maxLines ?? 4);
    lines.forEach((t, i) => out.push({ ...it, text: t, gap: i === 0 ? it.gap : it.size * 1.18 }));
  }
  return out;
}
const height = (items: Item[]): number =>
  items.reduce((h, it) => h + it.gap + (it.kind === "box" ? height(it.items) + 70 : it.kind === "bar" ? 130 : it.kind === "art" ? it.h : 0), 0);

/**
 * Lays items top to bottom from `top`, shrinking everything uniformly if they would
 * run past `bottom`, so long venues or messages never fall off the card.
 */
function Flow({ items, top, bottom, width, center = false }: { items: Item[]; top: number; bottom: number; width: number; center?: boolean }) {
  const list = expand(items, width);
  const natural = height(list);
  const scale = Math.min(1, (bottom - top) / Math.max(1, natural));
  // Short content sits in the middle of its area instead of leaving a gap at the bottom.
  let y = center ? top + Math.max(0, (bottom - top - natural * scale) / 2) : top;
  const render = (it: Item, i: number | string): React.ReactNode => {
    y += it.gap * scale;
    if (it.kind === "text") {
      return (
        <text key={i} x={CX} y={y} textAnchor="middle" fontFamily={it.font} fontSize={it.size * scale} fontWeight={it.weight} fontStyle={it.italic ? "italic" : undefined}
          letterSpacing={it.spacing ? it.spacing * scale : undefined} fill={it.fill} opacity={it.opacity}>
          {it.text}
        </text>
      );
    }
    if (it.kind === "rule") {
      const w = 170 * scale;
      if (it.style === "dots") return <line key={i} x1={CX - 330} x2={CX + 330} y1={y} y2={y} stroke={it.fill} strokeWidth={6} strokeLinecap="round" strokeDasharray="0.1 16" />;
      if (it.style === "line") return <line key={i} x1={CX - w} x2={CX + w} y1={y} y2={y} stroke={it.fill} strokeWidth={1.5} />;
      return (
        <g key={i} stroke={it.fill} fill="none" strokeWidth={2}>
          <path d={`M${CX - w} ${y} Q ${CX - w / 2} ${y - 14} ${CX - 22} ${y} M${CX + w} ${y} Q ${CX + w / 2} ${y - 14} ${CX + 22} ${y}`} />
          <path d={`M${CX} ${y - 12} L${CX + 12} ${y} L${CX} ${y + 12} L${CX - 12} ${y} Z`} fill={it.fill} />
        </g>
      );
    }
    if (it.kind === "art") {
      const node = <g key={i}>{it.draw(y, scale)}</g>;
      y += it.h * scale;
      return node;
    }
    if (it.kind === "bar") {
      const h = 130 * scale;
      const col = (x: number, [a, b]: [string, string], big: boolean) => (
        <g>
          <text x={x} y={y + h * 0.42} textAnchor="middle" fontFamily={SANS} fontWeight={700} fontSize={(big ? 40 : 30) * scale} fill={it.ink}>{a}</text>
          <text x={x} y={y + h * 0.82} textAnchor="middle" fontFamily={SANS} fontWeight={big ? 700 : 400} fontSize={(big ? 40 : 24) * scale} fill={it.ink}>{b}</text>
        </g>
      );
      const node = (
        <g key={i}>
          {col(CX - 330, it.left, true)}
          <line x1={CX - 225} x2={CX - 225} y1={y + 10} y2={y + h - 6} stroke={it.fill} strokeWidth={3} />
          {col(CX, it.middle, false)}
          <line x1={CX + 225} x2={CX + 225} y1={y + 10} y2={y + h - 6} stroke={it.fill} strokeWidth={3} />
          {col(CX + 330, it.right, false)}
        </g>
      );
      y += h;
      return node;
    }
    // box: a highlighted panel around its own lines
    const inner = height(it.items) * scale + 70 * scale;
    const boxTop = y - 10 * scale;
    const node = (
      <g key={i}>
        <rect x={CX - 360} y={boxTop} width={720} height={inner} rx={22} fill={it.fill} stroke={it.stroke} strokeWidth={it.stroke ? 3 : 0} />
        {(() => {
          y += 22 * scale;
          return it.items.map((sub, j) => render(sub, `${i}-${j}`));
        })()}
      </g>
    );
    y = boxTop + inner;
    return node;
  };
  return <g>{list.map((it, i) => render(it, i))}</g>;
}

/* ───────────────────────── Shared ornaments ───────────────────────── */

function Flower({ x, y, size, fill, centre, rot = 0, petals = 5 }: { x: number; y: number; size: number; fill: string; centre: string; rot?: number; petals?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse key={i} cx={0} cy={-size * 0.55} rx={size * 0.34} ry={size * 0.55} fill={fill} transform={`rotate(${(i * 360) / petals})`} />
      ))}
      <circle r={size * 0.24} fill={centre} />
    </g>
  );
}
function Rose({ x, y, size, fill, dark }: { x: number; y: number; size: number; fill: string; dark: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={size} fill={fill} />
      {[0.78, 0.56, 0.34].map((k, i) => (
        <path key={i} d={`M${-size * k} 0 A ${size * k} ${size * k} 0 0 1 ${size * k * 0.9} ${-size * k * 0.2}`} fill="none" stroke={dark} strokeWidth={size * 0.09} opacity={0.55} transform={`rotate(${i * 70})`} />
      ))}
    </g>
  );
}
function Leaf({ x, y, len, angle, fill }: { x: number; y: number; len: number; angle: number; fill: string }) {
  return <path d={`M0 0 Q ${len * 0.5} ${-len * 0.28} ${len} 0 Q ${len * 0.5} ${len * 0.28} 0 0 Z`} fill={fill} transform={`translate(${x} ${y}) rotate(${angle})`} />;
}

/** Seeded choice, so "New pattern" gives each design a visibly different variation. */
const pick = <T,>(r: () => number, options: readonly T[]): T => options[Math.floor(r() * options.length) % options.length];

/* ───────────────────────── Designs ───────────────────────── */

interface DesignProps {
  p: Palette;
  r: () => number;
  text: InviteText;
  facts: InviteFacts;
  /** Prefix for SVG ids, unique per card, so two cards on a page never share gradients. */
  uid: string;
}

/** Palace arch with columns, a floral monogram wreath and lush florals at the base. */
function Royal({ p, r, text, facts, uid }: DesignProps) {
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

/** Symmetrical vine arch of leaves and small white flowers on a muted ground. */
function Botanical({ p, r, text, facts }: DesignProps) {
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

/** Hanging lanterns, bunting, a diya, fireworks and a diya border; venue in a highlighted box. */
function Festive({ p, r, text, facts }: DesignProps) {
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
        return <line key={i} x1={x + Math.cos(a) * s * 0.25} y1={y + Math.sin(a) * s * 0.25} x2={x + Math.cos(a) * s} y2={y + Math.sin(a) * s} stroke={c} strokeWidth={3} strokeLinecap="round" />;
      })}
      {Array.from({ length: 16 }, (_, i) => {
        const a = ((i + 0.5) / 16) * Math.PI * 2;
        return <circle key={`d${i}`} cx={x + Math.cos(a) * s * 1.12} cy={y + Math.sin(a) * s * 1.12} r={4} fill={c} />;
      })}
    </g>
  );
  const lantern = (x: number, len: number) => (
    <g>
      <line x1={x} y1={0} x2={x} y2={len} stroke={p.accent} strokeWidth={2} />
      <path d={`M${x - 34} ${len + 18} L${x} ${len} L${x + 34} ${len + 18} L${x + 26} ${len + 96} L${x - 26} ${len + 96} Z`} fill={lanternColour} />
      <path d={`M${x - 34} ${len + 18} L${x + 34} ${len + 18}`} stroke={p.accent} strokeWidth={6} />
      <rect x={x - 26} y={len + 50} width={52} height={10} fill={p.accent} />
      {[-14, -5, 5, 14].map((dx) => <line key={dx} x1={x + dx} y1={len + 96} x2={x + dx * 1.3} y2={len + 150} stroke={p.accent} strokeWidth={3} />)}
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
      {bursts.map((b, i) => <g key={i}>{burst(b.x, b.y, b.s, b.c)}</g>)}
      {/* bunting */}
      <path d={`M0 30 Q${CX} 110 ${CARD_W} 30`} fill="none" stroke={p.accent} strokeWidth={2} />
      {Array.from({ length: 13 }, (_, i) => {
        const x = 40 + i * 80;
        const t = x / CARD_W;
        const y = 30 + Math.sin(t * Math.PI) * 40;
        return <path key={i} d={`M${x - 26} ${y} L${x + 26} ${y} L${x} ${y + 46} Z`} fill={flagColours[i % flagColours.length]} />;
      })}
      {lantern(110, 70 + r() * 20)}
      {lantern(CARD_W - 110, 70 + r() * 20)}
      {diya(CX, 270, 1.6)}
      {/* diya border */}
      <rect x={0} y={CARD_H - 70} width={CARD_W} height={70} fill={p.accent} opacity={0.9} />
      {Array.from({ length: 14 }, (_, i) => <g key={i}>{diya(38 + i * 77, CARD_H - 30, 0.55)}</g>)}
      <Flow
        top={380}
        center
        bottom={CARD_H - 110}
        width={800}
        items={[
          { kind: "text", text: text.headline, font: SCRIPT, size: 78, fill: p.accent, gap: 0, factor: 0.42, maxLines: 2 },
          { kind: "rule", style: "ornate", fill: p.accent, gap: 48 },
          { kind: "text", text: text.names, font: CAPS, size: 34, spacing: 3, fill: p.ink, gap: 62, factor: 0.68, maxLines: 2 },
          { kind: "text", text: text.body, font: SERIF, size: 34, fill: p.ink, gap: 62, maxLines: 4 },
          { kind: "text", text: text.details, font: SERIF, size: 27, italic: true, fill: p.ink, opacity: 0.85, gap: 48, maxLines: 3 },
          {
            kind: "box",
            gap: 64,
            fill: p.accent,
            items: [
              { kind: "text", text: "✦ Venue ✦", font: CAPS, size: 26, spacing: 3, fill: p.bg, gap: 30 },
              { kind: "text", text: facts.venue, font: SERIF, size: 32, weight: 600, fill: p.bg, gap: 44, maxLines: 2 },
              { kind: "text", text: [facts.dates, facts.time].filter(Boolean).join(" · "), font: SERIF, size: 30, fill: p.bg, gap: 42 },
            ],
          },
          { kind: "text", text: facts.hosts ? "✦ Invited by ✦" : "", font: CAPS, size: 24, spacing: 3, fill: p.accent2, gap: 62 },
          { kind: "text", text: facts.hosts, font: SERIF, size: 34, weight: 600, fill: p.accent, gap: 44 },
          { kind: "text", text: facts.rsvp ? `RSVP · ${facts.rsvp}` : "", font: SERIF, size: 26, fill: p.ink, gap: 44 },
          { kind: "text", text: text.closing, font: SCRIPT, size: 44, fill: p.accent2, gap: 58, factor: 0.42, maxLines: 2 },
        ]}
      />
    </>
  );
}

/** Soft watercolour washes, confetti, a gift motif and a big gold script title. */
function Watercolour({ p, r, text, facts, uid }: DesignProps) {
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
          return <ellipse key={i} cx={x} cy={y} rx={260 + r() * 140} ry={200 + r() * 120} fill={`url(#${uid}wash${i % washes.length})`} />;
        })}
      </g>
      {Array.from({ length: 46 }, (_, i) => {
        let x = r() * CARD_W;
        const y = r() * CARD_H;
        if (x > 230 && x < CARD_W - 230 && y > 180 && y < CARD_H - 140) x = r() < 0.5 ? r() * 210 : CARD_W - r() * 210;
        const c = confetti[i % confetti.length];
        return i % 3 ? <circle key={i} cx={x} cy={y} r={4 + r() * 6} fill={c} opacity={0.8} /> : <rect key={i} x={x} y={y} width={10} height={22} rx={3} fill={c} opacity={0.8} transform={`rotate(${r() * 360} ${x} ${y})`} />;
      })}
      <Flow
        top={230}
        center
        bottom={CARD_H - 120}
        width={760}
        items={[
          { kind: "text", text: text.headline.toUpperCase(), font: CAPS, size: 26, spacing: 5, fill: p.ink, gap: 0, factor: 0.7, maxLines: 2 },
          { kind: "text", text: text.names, font: SCRIPT, size: 120, fill: p.accent, gap: 140, factor: 0.42, maxLines: 2 },
          { kind: "text", text: facts.dates, font: SERIF, size: 40, spacing: 2, fill: p.ink, gap: 90 },
          { kind: "art", gap: 36, h: 120, draw: (y, s) => <GiftMotif p={p} y={y + 50 * s} s={s} /> },
          { kind: "text", text: text.body, font: SERIF, size: 32, fill: p.ink, gap: 70, maxLines: 4 },
          { kind: "text", text: [facts.time, facts.venue].filter(Boolean).join("  |  "), font: SERIF, size: 30, fill: p.ink, gap: 60, maxLines: 2 },
          { kind: "text", text: text.details, font: SERIF, size: 27, italic: true, fill: p.ink, opacity: 0.85, gap: 46, maxLines: 3 },
          { kind: "text", text: text.closing, font: SCRIPT, size: 62, fill: p.ink, gap: 86, factor: 0.42, maxLines: 2 },
          { kind: "text", text: facts.hosts ? `– ${facts.hosts}` : "", font: SERIF, size: 28, italic: true, fill: p.ink, gap: 54 },
          { kind: "text", text: facts.rsvp ? `RSVP · ${facts.rsvp}` : "", font: CAPS, size: 20, spacing: 2, fill: p.ink, opacity: 0.8, gap: 46 },
        ]}
      />
    </>
  );
}

/** Bright party card: hats, stars, streamers, a cloud badge and a three-column info bar. */
function Party({ p, r, text, facts }: DesignProps) {
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

function Mandala({ p, r, text, facts }: DesignProps) {
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
          <path key={`${k}-${i}`} d={`M0 ${-size} Q${size * 0.55} 0 0 ${size} Q${-size * 0.55} 0 0 ${-size}Z`} transform={`translate(${x} ${y}) rotate(${(a * 180) / Math.PI + 90})`} fill="none" stroke={color} strokeWidth={2.5} opacity={0.9} />
        ),
      );
    }
    items.push(<circle key={`ring-${k}`} r={radius + size + 8} fill="none" stroke={p.accent} strokeWidth={1.2} strokeDasharray={k % 2 ? "2 10" : "none"} opacity={0.45} />);
  }
  return (
    <>
      <rect x={28} y={28} width={CARD_W - 56} height={CARD_H - 56} rx={18} fill="none" stroke={p.accent} strokeWidth={2} opacity={0.6} />
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

function Toran({ p, r, text, facts }: DesignProps) {
  // Variation per seed: number of strands, how deep the garland dips, bead colours.
  const n = 7 + Math.floor(r() * 5);
  const dip = 30 + r() * 70;
  const beads = pick(r, [[p.accent, p.accent2], ["#ff9f1c", "#ffd166"], ["#e63946", "#ffd166"], [p.accent2, "#ffffff"]]);
  const els: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = 60 + (i * (CARD_W - 120)) / (n - 1);
    const sag = Math.sin((i / (n - 1)) * Math.PI) * dip;
    const len = 90 + r() * 140;
    els.push(<line key={`s${i}`} x1={x} y1={40 + sag} x2={x} y2={40 + sag + len} stroke={p.accent} strokeWidth={2} />);
    for (let b = 0; b < Math.floor(len / 34); b++) els.push(<circle key={`b${i}-${b}`} cx={x} cy={60 + sag + b * 34} r={13} fill={beads[b % 2]} />);
    els.push(<path key={`l${i}`} d={`M${x} ${40 + sag + len} q14 18 0 40 q-14 -22 0 -40Z`} fill="#4f9d69" opacity={0.9} />);
  }
  return (
    <>
      <rect x={28} y={28} width={CARD_W - 56} height={CARD_H - 56} rx={18} fill="none" stroke={p.accent} strokeWidth={2} opacity={0.6} />
      <path d={`M40 40 Q${CX} 160 ${CARD_W - 40} 40`} fill="none" stroke={p.accent} strokeWidth={4} />
      {els}
      <StandardText p={p} text={text} facts={facts} top={450} />
    </>
  );
}

/** The classic centred layout used by the mandala and toran designs, now with script names. */
function StandardText({ p, text, facts, top }: { p: Palette; text: InviteText; facts: InviteFacts; top: number }) {
  return (
    <Flow
      top={top}
      bottom={CARD_H - 95}
      width={820}
      items={[
        { kind: "text", text: text.headline.toUpperCase(), font: CAPS, size: 28, spacing: 6, fill: p.accent, gap: 0, factor: 0.7, maxLines: 2 },
        { kind: "text", text: text.names, font: SCRIPT, size: 100, fill: p.ink, gap: 108, factor: 0.42, maxLines: 2 },
        { kind: "rule", style: "ornate", fill: p.accent, gap: 46 },
        { kind: "text", text: text.body, font: SERIF, size: 34, fill: p.ink, gap: 62, maxLines: 5 },
        { kind: "text", text: facts.dates, font: CAPS, size: 32, spacing: 2, weight: 600, fill: p.accent, gap: 76 },
        { kind: "text", text: facts.time, font: SERIF, size: 31, weight: 600, fill: p.ink, gap: 46 },
        { kind: "text", text: facts.venue, font: SERIF, size: 31, weight: 600, fill: p.ink, gap: 44, maxLines: 2 },
        { kind: "text", text: text.details, font: SERIF, size: 27, italic: true, fill: p.ink, opacity: 0.85, gap: 54, maxLines: 3 },
        { kind: "text", text: text.closing, font: SCRIPT, size: 48, fill: p.accent, gap: 76, factor: 0.42, maxLines: 2 },
        { kind: "text", text: facts.hosts ? `– ${facts.hosts}` : "", font: SERIF, size: 30, italic: true, fill: p.ink, gap: 48 },
        { kind: "text", text: facts.rsvp ? `RSVP · ${facts.rsvp}` : "", font: CAPS, size: 22, spacing: 2, fill: p.ink, opacity: 0.85, gap: 54 },
      ]}
    />
  );
}

/* ───────────────────────── Card ───────────────────────── */

interface Props {
  template: string;
  palette: string;
  seed: number;
  text: InviteText;
  facts: InviteFacts;
}

const InviteCard = forwardRef<SVGSVGElement, Props>(function InviteCard({ template, palette, seed, text, facts }, ref) {
  const id = resolveTemplate(template);
  const p = PALETTES.find((x) => x.id === resolvePalette(palette)) ?? PALETTES[0];
  const r = rng(seed);
  const uid = `c${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const Design = { royal: Royal, botanical: Botanical, festive: Festive, watercolour: Watercolour, party: Party, mandala: Mandala, toran: Toran }[id];

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${CARD_W} ${CARD_H}`} width={CARD_W} height={CARD_H} role="img" aria-label={`Invitation: ${text.headline} ${text.names}`}>
      <defs>
        <style>{FONT_CSS}</style>
        <linearGradient id={`${uid}bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.bg} />
          <stop offset="1" stopColor={p.bg2} />
        </linearGradient>
      </defs>
      <rect width={CARD_W} height={CARD_H} fill={`url(#${uid}bg)`} />
      <Design p={p} r={r} text={text} facts={facts} uid={uid} />
    </svg>
  );
});

/** Small gift box with sprigs, centred at `y` (drawn inside the watercolour flow). */
function GiftMotif({ p, y, s }: { p: Palette; y: number; s: number }) {
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

export default InviteCard;

/* ───────────────────────── Export ───────────────────────── */

const fontData = new Map<string, Promise<string>>();
/** Fetches a bundled font once and returns it as a data: URL. */
function inlineFont(url: string): Promise<string> {
  if (!fontData.has(url)) {
    fontData.set(
      url,
      fetch(url)
        .then((r) => r.blob())
        .then((b) => new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(b); })),
    );
  }
  return fontData.get(url)!;
}

/**
 * Renders the SVG to a PNG blob at full size. An SVG drawn as an image can't load
 * external files, so the bundled fonts are inlined first; otherwise the PNG would
 * fall back to system fonts and not match the preview.
 */
export async function svgToPng(svg: SVGSVGElement): Promise<Blob> {
  let xml = new XMLSerializer().serializeToString(svg);
  for (const [, url] of FONT_FILES) xml = xml.split(`url('${url}')`).join(`url('${await inlineFont(url)}')`);
  await document.fonts?.ready;
  const url = URL.createObjectURL(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Couldn't render the card"));
      img.src = url;
    });
    // Give the embedded fonts a moment to decode before drawing.
    await new Promise((r) => setTimeout(r, 120));
    const canvas = document.createElement("canvas");
    canvas.width = CARD_W;
    canvas.height = CARD_H;
    canvas.getContext("2d")!.drawImage(img, 0, 0, CARD_W, CARD_H);
    return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("PNG export failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}
