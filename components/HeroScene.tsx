"use client";

import dynamic from "next/dynamic";

// WebGL only runs in the browser, and only the landing page needs three.js.
const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false });

export default function HeroScene() {
  return <Hero3D />;
}
