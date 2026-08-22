import { clamp } from "@/lib/utils";
import type { ConfusionSignal } from "@/lib/constants";

/**
 * Confusion Radar.
 *
 * Right/wrong is a weak signal. We combine response latency, answer-changing,
 * repeated attempts, and the calibration gap (self-rated confidence vs. actual
 * correctness) to tell three states apart that a raw score can't:
 *
 *   - "solid":        correct and confident.
 *   - "shaky":        correct but unsure (right for the wrong reasons risk).
 *   - "unmastered":   wrong, but hesitant/searching — hasn't learned it yet.
 *   - "misconception": confidently wrong — a firmly-held incorrect model that
 *                      needs remediation, not just more practice.
 */

export type LearnerState = "solid" | "shaky" | "unmastered" | "misconception";

export interface RadarResult {
  label: LearnerState;
  misconceptionScore: number; // 0..1
  /** confidence - correctness. Positive = overconfident. */
  calibrationGap: number;
  notes: string[];
}

const FAST_MS = 4000;

export function classifyResponse(signal: ConfusionSignal): RadarResult {
  const { latencyMs, answerChanges, attempts, confidence, correct } = signal;
  const conf = clamp(confidence, 0, 1);
  const calibrationGap = conf - (correct ? 1 : 0);
  const notes: string[] = [];

  let misconceptionScore = 0;

  if (!correct) {
    if (conf >= 0.6) {
      misconceptionScore += 0.6;
      notes.push("Confidently wrong: firmly-held incorrect model.");
    }
    if (latencyMs < FAST_MS) {
      misconceptionScore += 0.2;
      notes.push("Answered quickly but incorrectly.");
    }
    if (attempts >= 2) {
      misconceptionScore += 0.2;
      notes.push("Repeated the same error across attempts.");
    }
    // Lots of answer changes signals searching/uncertainty, not a fixed belief.
    if (answerChanges >= 2) {
      misconceptionScore -= 0.2;
      notes.push("Changed answer several times: hesitant, likely not-yet-learned.");
    }
  }

  misconceptionScore = clamp(misconceptionScore, 0, 1);

  let label: LearnerState;
  if (correct) {
    label = conf >= 0.5 ? "solid" : "shaky";
    if (label === "shaky") notes.push("Correct but low confidence: reinforce to consolidate.");
  } else if (misconceptionScore >= 0.5) {
    label = "misconception";
  } else {
    label = "unmastered";
  }

  return {
    label,
    misconceptionScore: round2(misconceptionScore),
    calibrationGap: round2(calibrationGap),
    notes,
  };
}

/** A concept is flagged as a misconception (vs. simply unlearned) above this. */
export function isMisconception(result: RadarResult): boolean {
  return result.label === "misconception";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
