"use client";

import { useRef } from "react";

interface Props extends React.HTMLAttributes<HTMLElement> {
  as?: "div" | "button" | "article" | "a";
  max?: number; // max tilt in degrees
  children: React.ReactNode;
  [key: string]: unknown;
}

/**
 * Tilts its contents in 3D toward the pointer, with a soft glare. Skipped for touch
 * pointers and for users who prefer reduced motion, so it never gets in the way.
 */
export default function Tilt({ as = "div", max = 3, className = "", children, ...rest }: Props) {
  const ref = useRef<HTMLElement>(null);

  const enabled = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: React.PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el || !enabled()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(0)`;
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
    el.dataset.active = "true";
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.dataset.active = "false";
  };

  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={`tilt ${className}`} onPointerMove={onMove} onPointerLeave={onLeave} {...rest}>
      {children}
      <span className="glare" aria-hidden="true" />
    </Tag>
  );
}
