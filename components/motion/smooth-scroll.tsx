"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { useMotionEnabled } from "@/hooks/use-motion";

/**
 * Lenis smooth scroll. Disabled entirely when the learner has motion off
 * (in-app toggle) or the OS requests reduced motion — no orphaned RAF loop.
 */
export function SmoothScroll() {
  const motion = useMotionEnabled();

  useEffect(() => {
    if (!motion) return;

    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [motion]);

  return null;
}
