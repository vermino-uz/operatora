"use client";

import { useEffect, useRef } from "react";

/** Faint accent wash that follows the pointer. Kept large and heavily
 *  blurred so it reads as a barely-there highlight, not a spotlight. */
export function AuthCursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      glow.style.opacity = "1";
    };

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <div
        ref={glowRef}
        className="absolute top-0 left-0 size-[920px] rounded-full opacity-0 will-change-transform"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--accent) 22%, transparent) 0%, color-mix(in oklch, var(--accent) 7%, transparent) 42%, transparent 70%)",
          filter: "blur(160px)",
        }}
      />
    </div>
  );
}
