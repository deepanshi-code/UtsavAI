"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, NotebookPen, X } from "lucide-react";
import ThemePicker from "./ThemePicker";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/#features", label: "Features" },
  { href: "/#how", label: "How it works" },
  { href: "/plans", label: "My plans" },
];

export default function Nav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  return (
    <header className="nav no-print">
      <div className="container nav-inner">
        <Link href="/" className="logo" aria-label="UtsavAI home">
          <span className="logo-mark" aria-hidden="true">
            <NotebookPen size={18} strokeWidth={2} />
          </span>
          <span>
            Utsav<span className="grad-text">AI</span>
          </span>
        </Link>
        <span className="nav-theme">
          <ThemePicker />
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-icon nav-toggle"
          aria-expanded={open}
          aria-controls="nav-links"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
        </button>
        <nav id="nav-links" className="nav-links" data-open={open} aria-label="Main">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              aria-current={path === l.href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link href="/plan/new" className="btn btn-primary btn-sm" style={{ marginLeft: 8 }}>
            Start planning
          </Link>
        </nav>
      </div>
    </header>
  );
}
