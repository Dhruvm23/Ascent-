"use client";

import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { gsap } from "gsap";
import { useGSAP } from "@/hooks/use-gsap";
import { useMotionEnabled } from "@/hooks/use-motion";
import { masteryColor, clamp } from "@/lib/utils";

export interface MapNode {
  id: string;
  name: string;
  pKnown: number;
  misconception: boolean;
  due: boolean;
  elevation: number;
  prerequisiteIds: string[];
  isGoal: boolean;
}

/**
 * The knowledge graph AS a topographic route map — the product's signature.
 * Concepts are waypoints laid out by elevation (prerequisite depth); mastery
 * warms each waypoint up the valley→summit colour scale; the current concept
 * flies the survey flag; prerequisites are the climbing route between them.
 */
export function RouteMap({
  nodes,
  currentConceptId,
}: {
  nodes: MapNode[];
  currentConceptId: string | null;
}) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const motion = useMotionEnabled();

  const layout = useMemo(() => computeLayout(nodes), [nodes]);

  useGSAP(
    () => {
      if (!motion || !ref.current) return;
      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
      tl.from(ref.current.querySelectorAll<SVGPathElement>(".edge"), {
        opacity: 0,
        duration: 0.6,
        stagger: 0.03,
      });
      tl.from(
        ref.current.querySelectorAll<HTMLElement>(".waypoint"),
        { scale: 0, opacity: 0, transformOrigin: "center", stagger: 0.05, duration: 0.4, ease: "back.out(1.7)" },
        "-=0.3",
      );
    },
    { scope: ref, dependencies: [motion, nodes.length] },
  );

  const byId = new Map(layout.map((l) => [l.id, l]));

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 10",
        minHeight: 360,
        background: "var(--vellum)",
        border: "1.5px solid var(--basalt)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
      role="group"
      aria-label="Your knowledge route map. Each waypoint is a concept; colour shows mastery."
    >
      {/* contour texture */}
      <div aria-hidden="true" className="topo-rings" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />

      {/* edges */}
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {layout.flatMap((node) =>
          node.prerequisiteIds
            .map((p) => byId.get(p))
            .filter(Boolean)
            .map((prereq) => (
              <line
                key={`${prereq!.id}-${node.id}`}
                className="edge"
                x1={prereq!.x}
                y1={prereq!.y}
                x2={node.x}
                y2={node.y}
                stroke="var(--basalt)"
                strokeWidth="0.35"
                strokeDasharray="1.2 1.2"
                vectorEffect="non-scaling-stroke"
                opacity={0.55}
              />
            )),
        )}
      </svg>

      {/* waypoints */}
      {layout.map((node) => {
        const isCurrent = node.id === currentConceptId;
        const pct = Math.round(node.pKnown * 100);
        return (
          <button
            key={node.id}
            type="button"
            className="waypoint"
            onClick={() => router.push(`/learn/${encodeURIComponent(node.id)}`)}
            aria-label={`${node.name}. Mastery ${pct} percent.${node.misconception ? " Misconception flagged." : ""}${node.due ? " Review due." : ""}${isCurrent ? " Recommended next." : ""}`}
            style={{
              position: "absolute",
              left: `${node.x}%`,
              top: `${node.y}%`,
              transform: "translate(-50%, -50%)",
              display: "grid",
              placeItems: "center",
              gap: "0.3rem",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              width: "8.5rem",
            }}
          >
            <span
              style={{
                position: "relative",
                width: isCurrent ? 30 : 24,
                height: isCurrent ? 30 : 24,
                borderRadius: "50%",
                background: masteryColor(node.pKnown),
                border: `2px solid ${node.misconception ? "var(--misconception)" : "var(--basalt)"}`,
                boxShadow: isCurrent ? "0 0 0 4px color-mix(in srgb, var(--flag) 40%, transparent)" : "none",
                display: "grid",
                placeItems: "center",
              }}
            >
              {node.due && (
                <span
                  aria-hidden="true"
                  style={{ position: "absolute", top: -6, right: -6, width: 10, height: 10, borderRadius: "50%", background: "var(--flag)", border: "1.5px solid var(--basalt)" }}
                />
              )}
              {isCurrent && (
                <span aria-hidden="true" style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", width: 2, height: 14, background: "var(--basalt)" }}>
                  <span style={{ position: "absolute", top: 0, left: 2, width: 0, height: 0, borderTop: "5px solid transparent", borderBottom: "5px solid transparent", borderLeft: "9px solid var(--flag)" }} />
                </span>
              )}
            </span>
            <span
              className="data"
              style={{
                fontSize: "0.6rem",
                textAlign: "center",
                lineHeight: 1.15,
                color: "var(--basalt)",
                background: "color-mix(in srgb, var(--vellum) 82%, transparent)",
                padding: "1px 4px",
                borderRadius: 2,
              }}
            >
              {node.name}
              <br />
              <span style={{ color: "var(--muted)" }}>{pct}%</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type Laid = MapNode & { x: number; y: number };

/** Layout: x rises with prerequisite depth (valley→summit), siblings spread vertically, ascent tilts upward to the top-right. */
function computeLayout(nodes: MapNode[]): Laid[] {
  const maxE = Math.max(1, ...nodes.map((n) => n.elevation));
  const columns = new Map<number, MapNode[]>();
  for (const n of nodes) {
    columns.set(n.elevation, [...(columns.get(n.elevation) ?? []), n]);
  }
  const out: Laid[] = [];
  for (const [depth, group] of columns) {
    const sorted = [...group].sort((a, b) => a.name.localeCompare(b.name));
    const centerY = 0.82 - 0.62 * (depth / maxE);
    sorted.forEach((n, i) => {
      const offset = (i - (sorted.length - 1) / 2) * 0.16;
      out.push({
        ...n,
        x: (0.1 + 0.8 * (depth / maxE)) * 100,
        y: clamp(centerY + offset, 0.08, 0.9) * 100,
      });
    });
  }
  return out;
}
