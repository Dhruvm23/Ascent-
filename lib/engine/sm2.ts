import type { Sm2State } from "./types";
import { clamp } from "@/lib/utils";

/**
 * SM-2 spaced repetition, forgetting-curve aware.
 *
 * We schedule reviews to resurface a concept just before predicted decay,
 * and we can project retrievability at any moment so the UI can show mastery
 * visibly "decaying" if a concept goes unreviewed.
 */

const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;
const DAY_MS = 24 * 60 * 60 * 1000;

export function initialSm2(now: Date = new Date()): Sm2State {
  return {
    easeFactor: DEFAULT_EASE,
    intervalDays: 0,
    repetitions: 0,
    dueAt: now.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

/**
 * Advance SM-2 state after a review graded 0..5.
 * quality < 3 = failed recall -> reset repetitions and review again tomorrow.
 */
export function sm2Update(state: Sm2State, quality: number, now: Date = new Date()): Sm2State {
  const q = clamp(Math.round(quality), 0, 5);

  let { easeFactor, intervalDays, repetitions } = state;

  if (q < 3) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  easeFactor = Math.max(MIN_EASE, easeFactor);

  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS);

  return {
    easeFactor: round2(easeFactor),
    intervalDays,
    repetitions,
    dueAt: dueAt.toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}

/** Map a mastery answer to an SM-2 quality grade (0..5). */
export function qualityFromAnswer(correct: boolean, confidence: number, latencyMs: number): number {
  if (!correct) return confidence > 0.6 ? 1 : 2; // confidently wrong grades lowest
  // Correct: reward speed + confidence.
  const fast = latencyMs < 6000;
  if (confidence >= 0.7 && fast) return 5;
  if (confidence >= 0.5) return 4;
  return 3;
}

/**
 * Estimated current retrievability R in [0,1] using an exponential forgetting
 * curve R = exp(-t / S), where stability S grows with the review interval.
 */
export function retrievability(state: Sm2State, now: Date = new Date()): number {
  const stabilityDays = Math.max(1, state.intervalDays) * state.easeFactor;
  const elapsedDays = (now.getTime() - new Date(state.lastReviewedAt).getTime()) / DAY_MS;
  if (elapsedDays <= 0) return 1;
  return clamp(Math.exp(-elapsedDays / stabilityDays), 0, 1);
}

export function isDue(state: Sm2State, now: Date = new Date()): boolean {
  return new Date(state.dueAt).getTime() <= now.getTime();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
