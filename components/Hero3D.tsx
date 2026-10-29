"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Landing-page scene: a faceted gem wrapped in two glowing rings, inside a slowly
 * drifting field of marigold / magenta particles, all leaning toward the pointer.
 * Renders one still frame for reduced-motion users and pauses when off-screen.
 */
export default function Hero3D() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // no WebGL: the CSS background still looks fine
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x08070d, 0.035);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    // Gem
    const group = new THREE.Group();
    scene.add(group);
    const gem = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({ color: 0xf6a623, emissive: 0x9a2b12, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.35, flatShading: true }),
    );
    group.add(gem);
    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.95, 1),
      new THREE.MeshBasicMaterial({ color: 0xe5398c, wireframe: true, transparent: true, opacity: 0.18 }),
    );
    group.add(wire);

    // Rings
    const ringMat = (c: number) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 });
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(2.8, 0.025, 16, 160), ringMat(0xf6a623));
    ring1.rotation.x = Math.PI / 2.4;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.015, 16, 160), ringMat(0x8b5cf6));
    ring2.rotation.set(Math.PI / 1.8, 0.4, 0);
    group.add(ring1, ring2);

    // Particles
    const N = window.innerWidth < 700 ? 700 : 1600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const palette = [new THREE.Color(0xf6a623), new THREE.Color(0xff7a2f), new THREE.Color(0xe5398c), new THREE.Color(0x8b5cf6)];
    for (let i = 0; i < N; i++) {
      const r = 4 + Math.random() * 10;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th) * 0.6, r * Math.cos(ph) - 2], i * 3);
      const c = palette[i % palette.length];
      col.set([c.r, c.g, c.b], i * 3);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const points = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({ size: 0.05, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    scene.add(points);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.PointLight(0xffb347, 90, 30);
    key.position.set(4, 3, 5);
    const rim = new THREE.PointLight(0xe5398c, 70, 30);
    rim.position.set(-5, -2, 3);
    scene.add(key, rim);

    // Wide screens: gem beside the headline (its centre ~75% across). Narrower ones: pushed
    // back and dimmed behind the text so it reads as atmosphere, not clutter.
    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z * camera.aspect;
      const wide = w >= 1200;
      group.position.set(wide ? halfWidth * 0.5 : halfWidth * 0.3, wide ? 0 : 0.6, wide ? 0 : -4);
      group.scale.setScalar(wide ? 1 : 0.9);
      (gem.material as THREE.MeshStandardMaterial).opacity = wide ? 1 : 0.55;
      (gem.material as THREE.MeshStandardMaterial).transparent = !wide;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const target = { x: 0, y: 0 };
    const onPointer = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth - 0.5) * 2;
      target.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    let visible = true;
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);

    const clock = new THREE.Clock();
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) return;
      const t = clock.getElapsedTime();
      gem.rotation.x = t * 0.25;
      gem.rotation.y = t * 0.35;
      wire.rotation.y = -t * 0.15;
      ring1.rotation.z = t * 0.2;
      ring2.rotation.z = -t * 0.12;
      points.rotation.y = t * 0.02;
      group.rotation.z = Math.sin(t * 0.6) * 0.08;
      camera.position.x += (target.x * 0.8 - camera.position.x) * 0.04;
      camera.position.y += (-target.y * 0.5 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    if (reduced) {
      gem.rotation.set(0.4, 0.6, 0);
      renderer.render(scene, camera);
    } else {
      tick();
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="hero-canvas" aria-hidden="true" />;
}
