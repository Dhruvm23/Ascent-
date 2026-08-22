import { describe, it, expect } from "vitest";
import { classifyResponse, isMisconception } from "@/lib/engine/confusion-radar";
import type { ConfusionSignal } from "@/lib/constants";

function signal(overrides: Partial<ConfusionSignal> = {}): ConfusionSignal {
  return {
    latencyMs: 8000,
    answerChanges: 0,
    attempts: 1,
    confidence: 0.5,
    correct: true,
    ...overrides,
  };
}

describe("classifyResponse", () => {
  it("labels confident + correct as solid", () => {
    const r = classifyResponse(signal({ correct: true, confidence: 0.8 }));
    expect(r.label).toBe("solid");
  });

  it("labels correct-but-unsure as shaky", () => {
    const r = classifyResponse(signal({ correct: true, confidence: 0.2 }));
    expect(r.label).toBe("shaky");
  });

  it("flags a confident, fast, wrong answer as a misconception", () => {
    const r = classifyResponse(
      signal({ correct: false, confidence: 0.9, latencyMs: 2000 }),
    );
    expect(r.label).toBe("misconception");
    expect(isMisconception(r)).toBe(true);
    expect(r.misconceptionScore).toBeGreaterThanOrEqual(0.5);
  });

  it("treats a hesitant, answer-changing wrong response as unmastered, not misconception", () => {
    const r = classifyResponse(
      signal({ correct: false, confidence: 0.2, answerChanges: 3, latencyMs: 15000 }),
    );
    expect(r.label).toBe("unmastered");
    expect(isMisconception(r)).toBe(false);
  });

  it("computes a positive calibration gap for overconfident wrong answers", () => {
    const r = classifyResponse(signal({ correct: false, confidence: 0.9 }));
    expect(r.calibrationGap).toBeGreaterThan(0);
  });

  it("keeps the misconception score within [0,1]", () => {
    const r = classifyResponse(
      signal({ correct: false, confidence: 1, latencyMs: 100, attempts: 5 }),
    );
    expect(r.misconceptionScore).toBeLessThanOrEqual(1);
    expect(r.misconceptionScore).toBeGreaterThanOrEqual(0);
  });
});
