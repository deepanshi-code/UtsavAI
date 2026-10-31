/** The invitation designs and colour palettes on offer, plus mappings for older saved choices. */

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
export type Palette = (typeof PALETTES)[number];
/** Palettes from earlier versions that no longer exist. */
const LEGACY_PALETTE: Record<string, PaletteId> = { ivory: "peach", pastel: "wash" };
export const resolvePalette = (id: string): PaletteId => (PALETTES.some((p) => p.id === id) ? (id as PaletteId) : LEGACY_PALETTE[id] ?? "peach");

export const CARD_W = 1080;
export const CARD_H = 1350;
export const CX = CARD_W / 2;
