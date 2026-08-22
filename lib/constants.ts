export const PRESENTATION_MODES = ["explorer", "focus", "mastery"] as const;
export type PresentationMode = (typeof PRESENTATION_MODES)[number];

export const MODE_META: Record<
  PresentationMode,
  { label: string; who: string; blurb: string }
> = {
  explorer: {
    label: "Explorer",
    who: "Younger learners",
    blurb:
      "Bigger targets, plain language, more encouragement. Progress reads as a journey, not a scoreboard.",
  },
  focus: {
    label: "Focus",
    who: "Students & teens",
    blurb:
      "Minimal distraction, one clear next action at a time, session-length awareness.",
  },
  mastery: {
    label: "Mastery",
    who: "Adults & professionals",
    blurb:
      "Dense, metrics-forward, fast. Probabilities and pace plans up front, less ornamentation.",
  },
};

export const DEFAULT_MODE: PresentationMode = "focus";

/** Signals the Confusion Radar consumes to separate "misconception" from "not learned yet". */
export type ConfusionSignal = {
  latencyMs: number;
  answerChanges: number;
  attempts: number;
  confidence: number; // learner self-rating 0..1
  correct: boolean;
};

export const INTEREST_SUGGESTIONS = [
  "Basketball",
  "Cooking",
  "Video games",
  "Gardening",
  "Cars",
  "Space",
  "Music production",
  "Football",
  "Chess",
  "Fashion",
  "Investing",
  "Hiking",
] as const;
