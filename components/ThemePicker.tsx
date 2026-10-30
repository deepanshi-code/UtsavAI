"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { applyTheme, DEFAULT_THEME, THEMES, type ThemeId } from "@/lib/themes";

export default function ThemePicker() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<ThemeId>(DEFAULT_THEME);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent((document.documentElement.dataset.theme as ThemeId) || DEFAULT_THEME);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div className="theme-picker" ref={ref}>
      <button
        type="button"
        className="btn btn-ghost btn-icon btn-sm"
        aria-label="Change colour theme"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="theme-dot" aria-hidden="true" />
      </button>
      {open && (
        <div className="theme-menu" role="menu" aria-label="Colour theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="menuitemradio"
              aria-checked={current === t.id}
              className="theme-item"
              onClick={() => {
                applyTheme(t.id);
                setCurrent(t.id);
                setOpen(false);
              }}
            >
              <span className="theme-swatch" aria-hidden="true">
                {t.swatch.map((c) => <span key={c} style={{ background: c }} />)}
              </span>
              {t.label}
              {current === t.id && <span className="spacer" aria-hidden="true" />}
              {current === t.id && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
