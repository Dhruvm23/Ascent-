import { planNext, type PlannerOptions } from "@/lib/engine/path-planner";
import { buildPacePlan } from "@/lib/engine/goal-planner";
import type { ConceptNode, MasteryRecord, PlannerResult } from "@/lib/engine/types";

/**
 * Path Planner Agent.
 *
 * Deliberately deterministic: the "decide the next concept" logic lives in the
 * pure, unit-tested engine (planNext) rather than in an LLM, so the core
 * adaptive decision is reproducible and auditable. This module is the agent
 * boundary that composes the graph, mastery state, and goal into one call the
 * routes use — and where an LLM narration layer would attach if desired.
 */
export function decideNext(
  nodes: ConceptNode[],
  mastery: Map<string, MasteryRecord>,
  options: PlannerOptions = {},
): PlannerResult {
  return planNext(nodes, mastery, options);
}

export function planGoalRoute(
  nodes: ConceptNode[],
  mastery: Map<string, MasteryRecord>,
  targetConceptIds: string[],
  targetWeeks: number,
  now?: Date,
) {
  return buildPacePlan(nodes, mastery, targetConceptIds, targetWeeks, { now });
}
