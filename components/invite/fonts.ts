// Bundled fonts (with system fallbacks for Devanagari and anything else they lack).
export const SCRIPT = "'UV Script', 'Great Vibes', 'Segoe Script', 'Nirmala UI', cursive";
export const SERIF = "'UV Serif', 'Cormorant Garamond', Georgia, 'Nirmala UI', 'Noto Serif Devanagari', serif";
export const CAPS = "'UV Caps', Cinzel, Georgia, 'Nirmala UI', serif";
export const SANS = "'Segoe UI', Arial, 'Nirmala UI', 'Noto Sans Devanagari', sans-serif";
export const FONT_FILES = [
  ["UV Script", "/fonts/great-vibes-latin-400-normal.woff2", 400, "normal"],
  ["UV Serif", "/fonts/cormorant-garamond-latin-400-normal.woff2", 400, "normal"],
  ["UV Serif", "/fonts/cormorant-garamond-latin-400-italic.woff2", 400, "italic"],
  ["UV Serif", "/fonts/cormorant-garamond-latin-600-normal.woff2", 600, "normal"],
  ["UV Caps", "/fonts/cinzel-latin-400-normal.woff2", 400, "normal"],
  ["UV Caps", "/fonts/cinzel-latin-600-normal.woff2", 600, "normal"],
] as const;
export const FONT_CSS = FONT_FILES.map(([fam, url, w, s]) => `@font-face{font-family:'${fam}';src:url('${url}') format('woff2');font-weight:${w};font-style:${s};}`).join("");
