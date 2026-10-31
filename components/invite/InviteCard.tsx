"use client";

import { forwardRef, useId } from "react";
import type { InviteFacts, InviteText } from "@/lib/invite";
import { CARD_H, CARD_W, PALETTES, resolvePalette, resolveTemplate } from "./catalog";
import { FONT_CSS } from "./fonts";
import { rng } from "./util";
import { Royal } from "./designs/Royal";
import { Botanical } from "./designs/Botanical";
import { Festive } from "./designs/Festive";
import { Watercolour } from "./designs/Watercolour";
import { Party } from "./designs/Party";
import { Mandala } from "./designs/Mandala";
import { Toran } from "./designs/Toran";

/*
 * Invitation cards drawn as a self-contained 1080×1350 SVG (Instagram portrait).
 * Each design has its own artwork and text layout. Fonts are bundled (SIL OFL, see
 * public/fonts) and embedded into the SVG on export, so the PNG matches the preview.
 */

export { PALETTES, resolvePalette, resolveTemplate, TEMPLATES, type PaletteId, type TemplateId } from "./catalog";
export { svgToPng } from "./export";

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

export default InviteCard;
