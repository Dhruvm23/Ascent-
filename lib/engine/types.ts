/**
 * Engine types. These are deliberately subject-agnostic: the engine never
 * knows whether a "concept" is a music interval, a cell organelle, or a cause
 * of a war. It only ever sees ids, prerequisite edges, and probabilities.
 */

export type DifficultyTier = 1 | 2 | 3 | 4 | 5;

/** A node in a generated curriculum graph. */
export interface ConceptNode {
  id: string;
  name: string;
  prerequisiteIds: string[];
  difficultyTier: DifficultyTier;
  description?: string;
}

/** Bayesian Knowledge Tracing parameters for a single concept. */
export interface BktParams {
  /** Prior P(known) before any evidence. */
  pInit: number;
  /** P(transition): chance of learning the skill on a given opportunity. */
  pTransit: number;
  /** P(slip): knows it but answers wrong. */
  pSlip: number;
  /** P(guess): doesn't know it but answers right. */
  pGuess: number;
}

/** Spaced-repetition (SM-2) scheduling state for a concept. */
export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  /** ISO timestamp when the concept is next due for review. */
  dueAt: string;
  lastReviewedAt: string;
}

/** The learner's live mastery state for one concept in one enrolment. */
export interface MasteryRecord {
  conceptId: string;
  pKnown: number;
  sm2: Sm2State;
  misconception: boolean;
}

export type PlannerAction = "learn" | "review" | "remediate" | "goal-complete";

export interface PlannerResult {
  action: PlannerAction;
  conceptId: string | null;
  reason: string;
  dueReviews: string[];
  eligible: string[];
}
