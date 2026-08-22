import { clamp } from "@/lib/utils";

/**
 * IRT-lite adaptive diagnostic.
 *
 * We track a single ability estimate (theta) on the same scale as item
 * difficulty. Each response nudges theta (Elo-style), and the next item is the
 * unanswered one whose difficulty best matches the current estimate — so the
 * pretest gets harder when you're right and easier when you're wrong, homing in
 * on your level in a handful of questions instead of a fixed 30-item slog.
 */

export interface DiagnosticItem {
  id: string;
  conceptId: string;
  /** Difficulty on the same logit-ish scale as ability, roughly -3..+3. */
  difficulty: number;
}

/** 2PL-ish probability of a correct response. */
export function probCorrect(theta: number, difficulty: number): number {
  return 1 / (1 + Math.exp(-(theta - difficulty)));
}

/** Update ability after one response. Learning rate shrinks as we see more items. */
export function updateAbility(
  theta: number,
  difficulty: number,
  correct: boolean,
  answered: number,
): number {
  const expected = probCorrect(theta, difficulty);
  const k = clamp(0.9 / (1 + answered * 0.35), 0.2, 0.9);
  const next = theta + k * ((correct ? 1 : 0) - expected);
  return clamp(next, -3.5, 3.5);
}

/** Pick the most informative next item: difficulty closest to current ability. */
export function pickNextItem(
  theta: number,
  items: DiagnosticItem[],
  askedIds: Set<string>,
): DiagnosticItem | null {
  const pool = items.filter((i) => !askedIds.has(i.id));
  if (pool.length === 0) return null;
  return pool.reduce((best, item) =>
    Math.abs(item.difficulty - theta) < Math.abs(best.difficulty - theta) ? item : best,
  );
}

/**
 * Seed a concept's initial P(known) from the final ability estimate and the
 * concept's difficulty tier (1..5). Higher ability vs. an easy concept => high
 * prior; low ability vs. a hard concept => low prior.
 */
export function abilityToPrior(theta: number, difficultyTier: number): number {
  const difficultyLogit = (clamp(difficultyTier, 1, 5) - 3) * 0.9;
  return clamp(probCorrect(theta, difficultyLogit), 0.05, 0.95);
}

export const DIAGNOSTIC_MAX_ITEMS = 8;
export const DIAGNOSTIC_MIN_ITEMS = 4;

/** Stop early once the ability estimate stabilises to save the learner time. */
export function shouldStop(
  answered: number,
  recentThetaDelta: number,
  maxItems = DIAGNOSTIC_MAX_ITEMS,
): boolean {
  if (answered >= maxItems) return true;
  if (answered >= DIAGNOSTIC_MIN_ITEMS && Math.abs(recentThetaDelta) < 0.08) return true;
  return false;
}
