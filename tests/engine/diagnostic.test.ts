import { describe, it, expect } from "vitest";
import {
  probCorrect,
  updateAbility,
  pickNextItem,
  abilityToPrior,
  shouldStop,
  type DiagnosticItem,
} from "@/lib/engine/diagnostic";

describe("probCorrect", () => {
  it("is 0.5 when ability equals difficulty", () => {
    expect(probCorrect(0, 0)).toBeCloseTo(0.5, 5);
  });
  it("rises with ability", () => {
    expect(probCorrect(2, 0)).toBeGreaterThan(probCorrect(0, 0));
  });
});

describe("updateAbility", () => {
  it("raises ability after a correct answer and lowers it after a wrong one", () => {
    expect(updateAbility(0, 0, true, 0)).toBeGreaterThan(0);
    expect(updateAbility(0, 0, false, 0)).toBeLessThan(0);
  });

  it("takes smaller steps as more items are answered", () => {
    const early = updateAbility(0, 0, true, 0) - 0;
    const late = updateAbility(0, 0, true, 10) - 0;
    expect(late).toBeLessThan(early);
  });
});

describe("pickNextItem", () => {
  const items: DiagnosticItem[] = [
    { id: "q1", conceptId: "a", difficulty: -2 },
    { id: "q2", conceptId: "b", difficulty: 0 },
    { id: "q3", conceptId: "c", difficulty: 2 },
  ];

  it("selects the item nearest the current ability", () => {
    expect(pickNextItem(1.9, items, new Set())?.id).toBe("q3");
    expect(pickNextItem(-1.9, items, new Set())?.id).toBe("q1");
  });

  it("skips already-asked items", () => {
    expect(pickNextItem(2, items, new Set(["q3"]))?.id).toBe("q2");
  });

  it("returns null when the pool is exhausted", () => {
    expect(pickNextItem(0, items, new Set(["q1", "q2", "q3"]))).toBeNull();
  });
});

describe("abilityToPrior", () => {
  it("gives higher priors for high ability on easy concepts", () => {
    const easyHigh = abilityToPrior(2, 1);
    const hardHigh = abilityToPrior(2, 5);
    expect(easyHigh).toBeGreaterThan(hardHigh);
  });
  it("stays within [0.05, 0.95]", () => {
    expect(abilityToPrior(5, 1)).toBeLessThanOrEqual(0.95);
    expect(abilityToPrior(-5, 5)).toBeGreaterThanOrEqual(0.05);
  });
});

describe("shouldStop", () => {
  it("stops at the max item cap", () => {
    expect(shouldStop(8, 1)).toBe(true);
  });
  it("stops early once ability stabilises", () => {
    expect(shouldStop(5, 0.02)).toBe(true);
  });
  it("keeps going before the minimum item count", () => {
    expect(shouldStop(2, 0.0)).toBe(false);
  });
});
