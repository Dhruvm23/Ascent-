import { describe, it, expect } from "vitest";
import { buildPacePlan } from "@/lib/engine/goal-planner";
import { initialSm2 } from "@/lib/engine/sm2";
import type { ConceptNode, MasteryRecord } from "@/lib/engine/types";

const graph: ConceptNode[] = [
  { id: "a", name: "A", prerequisiteIds: [], difficultyTier: 1 },
  { id: "b", name: "B", prerequisiteIds: ["a"], difficultyTier: 2 },
  { id: "c", name: "C", prerequisiteIds: ["b"], difficultyTier: 3 },
  { id: "d", name: "D", prerequisiteIds: ["c"], difficultyTier: 4 },
  { id: "off", name: "Off route", prerequisiteIds: [], difficultyTier: 1 },
];

function mastery(mastered: string[]): Map<string, MasteryRecord> {
  const map = new Map<string, MasteryRecord>();
  for (const n of graph) {
    map.set(n.id, {
      conceptId: n.id,
      pKnown: mastered.includes(n.id) ? 0.9 : 0.2,
      misconception: false,
      sm2: initialSm2(),
    });
  }
  return map;
}

describe("buildPacePlan", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("reverse-engineers only the required subgraph for the goal", () => {
    const plan = buildPacePlan(graph, mastery([]), ["c"], 3, { now });
    // Goal c requires a, b, c — not d, not off-route.
    expect(plan.requiredCount).toBe(3);
    expect(plan.requiredConceptIds.sort()).toEqual(["a", "b", "c"]);
  });

  it("counts mastered concepts and computes remaining", () => {
    const plan = buildPacePlan(graph, mastery(["a"]), ["c"], 3, { now });
    expect(plan.masteredCount).toBe(1);
    expect(plan.remainingCount).toBe(2);
  });

  it("spreads remaining concepts across the target weeks", () => {
    const plan = buildPacePlan(graph, mastery([]), ["d"], 2, { now });
    // d requires a,b,c,d = 4 concepts over 2 weeks
    expect(plan.requiredCount).toBe(4);
    expect(plan.conceptsPerWeek).toBe(2);
    expect(plan.weeks).toHaveLength(2);
    expect(plan.weeks[1].targetCumulativeConcepts).toBe(4);
  });

  it("reports full progress when the goal is already met", () => {
    const plan = buildPacePlan(graph, mastery(["a", "b", "c"]), ["c"], 4, { now });
    expect(plan.progress).toBe(1);
    expect(plan.remainingCount).toBe(0);
  });

  it("clamps target weeks to at least one", () => {
    const plan = buildPacePlan(graph, mastery([]), ["a"], 0, { now });
    expect(plan.targetWeeks).toBe(1);
    expect(plan.weeks).toHaveLength(1);
  });
});
