import type { InviteFacts, InviteText } from "@/lib/invite";
import { CARD_H, CX, type Palette } from "./catalog";
import { CAPS, SANS, SCRIPT, SERIF } from "./fonts";

/* ───────────────────────── Text layout ───────────────────────── */

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

export type Item =
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
export function Flow({ items, top, bottom, width, center = false }: { items: Item[]; top: number; bottom: number; width: number; center?: boolean }) {
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

/** The classic centred layout used by the mandala and toran designs, now with script names. */
export function StandardText({ p, text, facts, top }: { p: Palette; text: InviteText; facts: InviteFacts; top: number }) {
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
