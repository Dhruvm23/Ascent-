"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@/hooks/use-gsap";
import { useMotionEnabled } from "@/hooks/use-motion";

/**
 * Decorative topographic route: contour lines with a climbing route that draws
 * itself on load and waypoints that drop in and warm up the elevation scale.
 * This previews the product's signature (the knowledge graph as a route map).
 */
const WAYPOINTS = [
  { x: 60, y: 250, c: "var(--valley)" },
  { x: 150, y: 210, c: "var(--valley)" },
  { x: 235, y: 168, c: "var(--ridge)" },
  { x: 300, y: 120, c: "var(--ridge)" },
  { x: 360, y: 74, c: "var(--summit)" },
];

export function TopoHero() {
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();

  useGSAP(
    () => {
      if (!motion || !ref.current) return;
      const route = ref.current.querySelector<SVGPathElement>("#route");
      const pins = ref.current.querySelectorAll<SVGGElement>(".pin");
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      if (route) {
        const len = route.getTotalLength();
        gsap.set(route, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(route, { strokeDashoffset: 0, duration: 1.6, ease: "power1.inOut" });
      }
      tl.from(pins, { scale: 0, transformOrigin: "center", stagger: 0.18, duration: 0.4, ease: "back.out(2)" }, "-=1.1");
      tl.from(
        ref.current.querySelectorAll(".contour"),
        { opacity: 0, duration: 1, stagger: 0.08 },
        0,
      );
    },
    { scope: ref, dependencies: [motion] },
  );

  return (
    <div ref={ref} aria-hidden="true">
      <svg viewBox="0 0 420 300" width="100%" role="presentation" style={{ display: "block" }}>
        {/* contour rings */}
        {[0, 1, 2, 3, 4].map((i) => (
          <ellipse
            key={i}
            className="contour"
            cx={230 - i * 8}
            cy={150 + i * 6}
            rx={190 - i * 30}
            ry={120 - i * 18}
            fill="none"
            stroke="var(--contour)"
            strokeWidth="1"
            opacity={0.5 - i * 0.06}
          />
        ))}
        {/* the route */}
        <path
          id="route"
          d="M60 250 L150 210 L235 168 L300 120 L360 74"
          fill="none"
          stroke="var(--basalt)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1 8"
        />
        {/* waypoints */}
        {WAYPOINTS.map((w, i) => (
          <g className="pin" key={i}>
            <circle cx={w.x} cy={w.y} r={i === WAYPOINTS.length - 1 ? 9 : 7} fill={w.c} stroke="var(--basalt)" strokeWidth="2" />
            {i === WAYPOINTS.length - 1 && (
              <>
                <line x1={w.x} y1={w.y - 9} x2={w.x} y2={w.y - 26} stroke="var(--basalt)" strokeWidth="2" />
                <path d={`M${w.x} ${w.y - 25} L${w.x + 16} ${w.y - 21} L${w.x} ${w.y - 17} Z`} fill="var(--flag)" />
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}
