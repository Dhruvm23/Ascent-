import { describe, it, expect } from "vitest";
import {
  bktUpdate,
  predictCorrect,
  paramsForDifficulty,
  isMastered,
  DEFAULT_BKT,
} from "@/lib/engine/bkt";

describe("bktUpdate", () => {
  it("raises P(known) after a correct answer", () => {
    const before = 0.3;
    const after = bktUpdate(before, true);
    expect(after).toBeGreaterThan(before);
  });

  it("lowers the posterior after a wrong answer (before transition)", () => {
    // A wrong answer should pull mastery down relative to a correct one.
    const afterCorrect = bktUpdate(0.5, true);
    const afterWrong = bktUpdate(0.5, false);
    expect(afterWrong).toBeLessThan(afterCorrect);
  });

  it("keeps probabilities strictly within (0,1)", () => {
    let p = 0.5;
    for (let i = 0; i < 50; i++) p = bktUpdate(p, true);
    expect(p).toBeLessThan(1);
    expect(p).toBeGreaterThan(0);

    let q = 0.5;
    for (let i = 0; i < 50; i++) q = bktUpdate(q, false);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1);
  });

  it("converges upward with repeated correct answers", () => {
    let p = 0.2;
    const history: number[] = [];
    for (let i = 0; i < 10; i++) {
      p = bktUpdate(p, true);
      history.push(p);
    }
    for (let i = 1; i < history.length; i++) {
      expect(history[i]).toBeGreaterThanOrEqual(history[i - 1] - 1e-9);
    }
    expect(p).toBeGreaterThan(0.8);
  });

  it("is monotonic in prior for a given observation", () => {
    expect(bktUpdate(0.6, true)).toBeGreaterThan(bktUpdate(0.4, true));
  });
});

describe("predictCorrect", () => {
  it("is bounded by slip and guess parameters", () => {
    expect(predictCorrect(1)).toBeCloseTo(1 - DEFAULT_BKT.pSlip, 5);
    expect(predictCorrect(0)).toBeCloseTo(DEFAULT_BKT.pGuess, 5);
  });
});

describe("paramsForDifficulty", () => {
  it("makes harder tiers slip more and guess less", () => {
    const easy = paramsForDifficulty(1);
    const hard = paramsForDifficulty(5);
    expect(hard.pSlip).toBeGreaterThan(easy.pSlip);
    expect(hard.pGuess).toBeLessThan(easy.pGuess);
    expect(hard.pInit).toBeLessThan(easy.pInit);
  });
});

describe("isMastered", () => {
  it("uses the 0.8 threshold by default", () => {
    expect(isMastered(0.8)).toBe(true);
    expect(isMastered(0.79)).toBe(false);
  });
});
