import type { ConceptNode, MasteryRecord } from "./types";
import { extractSubgraph } from "./graph";
import { MASTERY_THRESHOLD } from "./bkt";

/**
 * Goal-based reverse planning.
 *
 * The learner states a goal ("write my own songs in 6 weeks"). Upstream, the
 * planner agent maps that goal to a set of target concept ids. Here we do the
 * deterministic part: reverse-engineer the required subgraph, compute a weekly
 * pace, and measure progress against it — the "route to the summit".
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PaceWeek {
  weekIndex: number;
  targetCumulativeConcepts: number;
  byDateISO: string;
}

export interface PacePlan {
  requiredConceptIds: string[];
  requiredCount: number;
  masteredCount: number;
  remainingCount: number;
  targetWeeks: number;
  conceptsPerWeek: number;
  progress: number; // 0..1
  weeks: PaceWeek[];
}

export function buildPacePlan(
  nodes: ConceptNode[],
  mastery: Map<string, MasteryRecord>,
  targetConceptIds: string[],
  targetWeeks: number,
  opts: { now?: Date; masteryThreshold?: number } = {},
): PacePlan {
  const now = opts.now ?? new Date();
  const threshold = opts.masteryThreshold ?? MASTERY_THRESHOLD;
  const weeks = Math.max(1, Math.round(targetWeeks));

  const required = [...extractSubgraph(nodes, targetConceptIds)];
  const requiredCount = required.length;
  const masteredCount = required.filter(
    (id) => (mastery.get(id)?.pKnown ?? 0) >= threshold,
  ).length;
  const remainingCount = Math.max(0, requiredCount - masteredCount);

  const conceptsPerWeek = Math.ceil(remainingCount / weeks) || 0;

  const weekPlan: PaceWeek[] = [];
  for (let w = 1; w <= weeks; w++) {
    const targetCumulative = Math.min(
      requiredCount,
      masteredCount + Math.ceil((remainingCount * w) / weeks),
    );
    weekPlan.push({
      weekIndex: w,
      targetCumulativeConcepts: targetCumulative,
      byDateISO: new Date(now.getTime() + w * 7 * DAY_MS).toISOString(),
    });
  }

  return {
    requiredConceptIds: required,
    requiredCount,
    masteredCount,
    remainingCount,
    targetWeeks: weeks,
    conceptsPerWeek,
    progress: requiredCount === 0 ? 1 : masteredCount / requiredCount,
    weeks: weekPlan,
  };
}
