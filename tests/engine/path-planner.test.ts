import { describe, it, expect } from "vitest";
import { planNext } from "@/lib/engine/path-planner";
import { initialSm2, sm2Update } from "@/lib/engine/sm2";
import type { ConceptNode, MasteryRecord } from "@/lib/engine/types";

const graph: ConceptNode[] = [
  { id: "notes", name: "Notes", prerequisiteIds: [], difficultyTier: 1 },
  { id: "intervals", name: "Intervals", prerequisiteIds: ["notes"], difficultyTier: 2 },
  { id: "scales", name: "Scales", prerequisiteIds: ["intervals"], difficultyTier: 3 },
  { id: "chords", name: "Chords", prerequisiteIds: ["scales"], difficultyTier: 4 },
];

function mastery(
  entries: Record<string, Partial<MasteryRecord>>,
  now = new Date("2026-01-01T00:00:00Z"),
): Map<string, MasteryRecord> {
  const map = new Map<string, MasteryRecord>();
  for (const n of graph) {
    const e = entries[n.id] ?? {};
    map.set(n.id, {
      conceptId: n.id,
      pKnown: e.pKnown ?? 0.2,
      misconception: e.misconception ?? false,
      sm2: e.sm2 ?? initialSm2(now),
    });
  }
  return map;
}

describe("planNext", () => {
  it("recommends the first unlocked concept for a fresh learner", () => {
    const res = planNext(graph, mastery({}));
    expect(res.action).toBe("learn");
    expect(res.conceptId).toBe("notes");
  });

  it("only unlocks a concept once its prerequisites are mastered", () => {
    const res = planNext(graph, mastery({ notes: { pKnown: 0.9 } }));
    expect(res.action).toBe("learn");
    expect(res.conceptId).toBe("intervals");
    // scales/chords are still locked behind intervals
    expect(res.eligible).not.toContain("scales");
  });

  it("prioritises remediating a misconception over learning new material", () => {
    const res = planNext(
      graph,
      mastery({ notes: { pKnown: 0.9 }, intervals: { misconception: true, pKnown: 0.4 } }),
    );
    expect(res.action).toBe("remediate");
    expect(res.conceptId).toBe("intervals");
  });

  it("surfaces a due review before teaching something new", () => {
    const now = new Date("2026-02-01T00:00:00Z");
    let due = initialSm2(new Date("2026-01-01T00:00:00Z"));
    due = sm2Update(due, 5, new Date("2026-01-01T00:00:00Z")); // due 2026-01-02, overdue by Feb
    const res = planNext(
      graph,
      mastery({ notes: { pKnown: 0.9, sm2: due }, intervals: { pKnown: 0.3 } }, now),
      { now },
    );
    expect(res.action).toBe("review");
    expect(res.conceptId).toBe("notes");
    expect(res.dueReviews).toContain("notes");
  });

  it("reports goal-complete when the whole goal subgraph is mastered", () => {
    const res = planNext(
      graph,
      mastery({ notes: { pKnown: 0.95 }, intervals: { pKnown: 0.9 } }),
      { goalConceptIds: ["intervals"] },
    );
    expect(res.action).toBe("goal-complete");
    expect(res.conceptId).toBeNull();
  });

  it("biases selection toward concepts on the goal route", () => {
    // Two concepts unlocked; only one is on the goal route.
    const branchy: ConceptNode[] = [
      { id: "root", name: "Root", prerequisiteIds: [], difficultyTier: 1 },
      { id: "goalpath", name: "Goal Path", prerequisiteIds: ["root"], difficultyTier: 2 },
      { id: "sidequest", name: "Side Quest", prerequisiteIds: ["root"], difficultyTier: 1 },
    ];
    const map = new Map<string, MasteryRecord>();
    for (const n of branchy) {
      map.set(n.id, {
        conceptId: n.id,
        pKnown: n.id === "root" ? 0.9 : 0.2,
        misconception: false,
        sm2: initialSm2(),
      });
    }
    const res = planNext(branchy, map, { goalConceptIds: ["goalpath"] });
    expect(res.conceptId).toBe("goalpath");
  });
});
