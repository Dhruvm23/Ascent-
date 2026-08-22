import type { ConceptNode, MasteryRecord, PlannerResult } from "./types";
import { MASTERY_THRESHOLD } from "./bkt";
import { computeElevation, extractSubgraph } from "./graph";
import { isDue } from "./sm2";

/**
 * Prerequisite-aware path planner. Given the current knowledge graph, the
 * learner's mastery state, and (optionally) a goal subgraph, it decides the
 * single next best thing to do. Priority order:
 *
 *   1. remediate — a flagged misconception blocks progress; fix it first.
 *   2. review    — a concept is due for spaced-repetition (before it decays).
 *   3. learn     — the next unlocked, unmastered concept (goal-biased,
 *                  easiest-first among ties). "Unlocked" = all prerequisites
 *                  are themselves mastered.
 *   4. goal-complete — nothing left on the route to the summit.
 *
 * Entirely pure and subject-agnostic: swap in any graph and it just works.
 */

export interface PlannerOptions {
  masteryThreshold?: number;
  /** Concept ids that make up the learner's goal ("route to the summit"). */
  goalConceptIds?: string[];
  now?: Date;
}

export function planNext(
  nodes: ConceptNode[],
  mastery: Map<string, MasteryRecord>,
  options: PlannerOptions = {},
): PlannerResult {
  const threshold = options.masteryThreshold ?? MASTERY_THRESHOLD;
  const now = options.now ?? new Date();
  const goalSet =
    options.goalConceptIds && options.goalConceptIds.length
      ? extractSubgraph(nodes, options.goalConceptIds)
      : null;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const elevation = computeElevation(nodes);
  const get = (id: string) => mastery.get(id);
  const masteredIds = new Set(
    nodes.filter((n) => (get(n.id)?.pKnown ?? 0) >= threshold).map((n) => n.id),
  );

  const inScope = (id: string) => !goalSet || goalSet.has(id);

  // 1. Misconceptions block understanding downstream — remediate first.
  const misconception = nodes
    .filter((n) => inScope(n.id) && get(n.id)?.misconception)
    .sort((a, b) => (elevation.get(a.id) ?? 0) - (elevation.get(b.id) ?? 0))[0];
  if (misconception) {
    return {
      action: "remediate",
      conceptId: misconception.id,
      reason: `"${misconception.name}" is flagged as a misconception — clearing it before climbing higher.`,
      dueReviews: dueReviewIds(nodes, mastery, now, inScope),
      eligible: [],
    };
  }

  // 2. Spaced-repetition reviews that are due (resurface before decay).
  const due = dueReviewIds(nodes, mastery, now, inScope);
  if (due.length) {
    const first = byId.get(due[0])!;
    return {
      action: "review",
      conceptId: first.id,
      reason: `"${first.name}" is due for review before it slips below recall.`,
      dueReviews: due,
      eligible: [],
    };
  }

  // 3. Next unlocked, unmastered concept.
  const eligible = nodes.filter((n) => {
    if (!inScope(n.id)) return false;
    if (masteredIds.has(n.id)) return false;
    return n.prerequisiteIds.every((p) => masteredIds.has(p) || !byId.has(p));
  });

  if (eligible.length === 0) {
    // Nothing unlocked. Either everything in scope is mastered, or we are stuck.
    const anythingLeft = nodes.some((n) => inScope(n.id) && !masteredIds.has(n.id));
    if (!anythingLeft) {
      return {
        action: "goal-complete",
        conceptId: null,
        reason: goalSet
          ? "Every concept on your route to the summit is mastered."
          : "Every concept in this course is mastered.",
        dueReviews: due,
        eligible: [],
      };
    }
    // Fallback: pick the lowest-elevation unmastered concept even if locked.
    const fallback = nodes
      .filter((n) => inScope(n.id) && !masteredIds.has(n.id))
      .sort(byReadiness(elevation, mastery, goalSet))[0];
    return {
      action: "learn",
      conceptId: fallback.id,
      reason: `Starting "${fallback.name}" to open up the rest of the route.`,
      dueReviews: due,
      eligible: [fallback.id],
    };
  }

  const ranked = [...eligible].sort(byReadiness(elevation, mastery, goalSet));
  const next = ranked[0];
  return {
    action: "learn",
    conceptId: next.id,
    reason: goalSet?.has(next.id)
      ? `"${next.name}" is the next unlocked step on your route to the summit.`
      : `"${next.name}" is unlocked and ready to learn next.`,
    dueReviews: due,
    eligible: ranked.map((n) => n.id),
  };
}

function dueReviewIds(
  nodes: ConceptNode[],
  mastery: Map<string, MasteryRecord>,
  now: Date,
  inScope: (id: string) => boolean,
): string[] {
  return nodes
    .filter((n) => {
      const m = mastery.get(n.id);
      if (!m || !inScope(n.id)) return false;
      // Only resurface concepts the learner has actually studied (has reps).
      return m.sm2.repetitions > 0 && isDue(m.sm2, now);
    })
    .sort((a, b) => {
      const da = new Date(mastery.get(a.id)!.sm2.dueAt).getTime();
      const db = new Date(mastery.get(b.id)!.sm2.dueAt).getTime();
      return da - db;
    })
    .map((n) => n.id);
}

/** Rank: goal concepts first, then lower elevation, then higher readiness. */
function byReadiness(
  elevation: Map<string, number>,
  mastery: Map<string, MasteryRecord>,
  goalSet: Set<string> | null,
) {
  return (a: ConceptNode, b: ConceptNode): number => {
    if (goalSet) {
      const ga = goalSet.has(a.id) ? 0 : 1;
      const gb = goalSet.has(b.id) ? 0 : 1;
      if (ga !== gb) return ga - gb;
    }
    const ea = elevation.get(a.id) ?? 0;
    const eb = elevation.get(b.id) ?? 0;
    if (ea !== eb) return ea - eb;
    if (a.difficultyTier !== b.difficultyTier) return a.difficultyTier - b.difficultyTier;
    const pa = mastery.get(a.id)?.pKnown ?? 0;
    const pb = mastery.get(b.id)?.pKnown ?? 0;
    return pb - pa; // closer to mastery first
  };
}
