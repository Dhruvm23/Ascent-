import type { BktParams } from "./types";
import { clamp } from "@/lib/utils";

/**
 * Bayesian Knowledge Tracing.
 *
 * Mastery is a probability P(known), not a flat percentage. After each
 * observed answer we compute the posterior probability the skill was known,
 * then apply the learning-transition probability to predict the new state.
 *
 * This is the spine of the "Cognitive Fingerprint": every interaction nudges
 * this number, and the whole system acts on it.
 */

export const DEFAULT_BKT: BktParams = {
  pInit: 0.25,
  pTransit: 0.15,
  pSlip: 0.1,
  pGuess: 0.2,
};

/** Difficulty tiers get slightly harder-to-guess / easier-to-slip params. */
export function paramsForDifficulty(tier: number): BktParams {
  const t = clamp(tier, 1, 5);
  return {
    pInit: clamp(0.35 - t * 0.05, 0.05, 0.4),
    pTransit: clamp(0.2 - t * 0.02, 0.06, 0.2),
    pSlip: clamp(0.06 + t * 0.02, 0.05, 0.3),
    pGuess: clamp(0.28 - t * 0.03, 0.08, 0.3),
  };
}

/**
 * Update P(known) after one observation.
 * @returns the predicted P(known) for the next opportunity, in [0.001, 0.999].
 */
export function bktUpdate(
  pKnown: number,
  correct: boolean,
  params: BktParams = DEFAULT_BKT,
): number {
  const pL = clamp(pKnown, 0.001, 0.999);
  const { pTransit, pSlip, pGuess } = params;

  // Posterior P(known | observation) via Bayes.
  let posterior: number;
  if (correct) {
    const num = pL * (1 - pSlip);
    const den = num + (1 - pL) * pGuess;
    posterior = den === 0 ? pL : num / den;
  } else {
    const num = pL * pSlip;
    const den = num + (1 - pL) * (1 - pGuess);
    posterior = den === 0 ? pL : num / den;
  }

  // Predict next state after a learning opportunity.
  const predicted = posterior + (1 - posterior) * pTransit;
  return clamp(predicted, 0.001, 0.999);
}

/**
 * Probability the learner answers the next item correctly, given current
 * P(known). Used to calibrate quiz difficulty and to expose "readiness".
 */
export function predictCorrect(pKnown: number, params: BktParams = DEFAULT_BKT): number {
  const pL = clamp(pKnown, 0, 1);
  return clamp(pL * (1 - params.pSlip) + (1 - pL) * params.pGuess, 0, 1);
}

export const MASTERY_THRESHOLD = 0.8;

export function isMastered(pKnown: number, threshold = MASTERY_THRESHOLD): boolean {
  return pKnown >= threshold;
}
