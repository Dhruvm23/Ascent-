"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@/hooks/use-gsap";
import { useMotionEnabled } from "@/hooks/use-motion";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Scroll-triggered reveal. When motion is off, children render in their final
 * state immediately (no hidden content, no layout shift) — accessibility floor.
 */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const motion = useMotionEnabled();

  useGSAP(
    () => {
      if (!motion || !ref.current) return;
      gsap.from(ref.current, {
        opacity: 0,
        y,
        duration: 0.7,
        delay,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 85%",
          once: true,
        },
      });
    },
    { scope: ref, dependencies: [motion] },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
