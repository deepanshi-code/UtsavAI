export const THEMES = [
  { id: "paper", label: "Paper", swatch: ["#faf7f2", "#b4365f", "#2a7f75"] },
  { id: "blush", label: "Blush", swatch: ["#fbf3f4", "#a8346a", "#6b5bc4"] },
  { id: "mint", label: "Mint", swatch: ["#f2f7f4", "#1b7a63", "#b84d6a"] },
  { id: "night", label: "Night journal", swatch: ["#17151f", "#e8829f", "#6fc2b5"] },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];
export const DEFAULT_THEME: ThemeId = "paper";

export const THEME_KEY = "utsavai.theme";
export const THEME_EVENT = "utsavai:theme";

/**
 * Runs in <head> before paint so the saved theme applies without a flash.
 * Only known ids are applied, so names saved by older versions are ignored.
 */
export const themeBootScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(${JSON.stringify(THEMES.map((t) => t.id))}.indexOf(t)>-1)document.documentElement.dataset.theme=t}catch(e){}`;

export function applyTheme(id: ThemeId) {
  document.documentElement.dataset.theme = id;
  try {
    localStorage.setItem(THEME_KEY, id);
  } catch {
    // storage blocked: the theme still applies for this visit
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
