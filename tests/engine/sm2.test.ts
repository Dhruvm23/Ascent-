import { describe, it, expect } from "vitest";
import {
  initialSm2,
  sm2Update,
  qualityFromAnswer,
  retrievability,
  isDue,
} from "@/lib/engine/sm2";

const now = new Date("2026-01-01T00:00:00.000Z");

describe("sm2Update", () => {
  it("schedules first two successful reviews at 1 then 6 days", () => {
    let s = initialSm2(now);
    s = sm2Update(s, 5, now);
    expect(s.intervalDays).toBe(1);
    expect(s.repetitions).toBe(1);
    s = sm2Update(s, 5, now);
    expect(s.intervalDays).toBe(6);
    expect(s.repetitions).toBe(2);
  });

  it("grows the interval by the ease factor after the second review", () => {
    let s = initialSm2(now);
    s = sm2Update(s, 5, now);
    s = sm2Update(s, 5, now);
    const before = s.intervalDays;
    s = sm2Update(s, 5, now);
    expect(s.intervalDays).toBeGreaterThan(before);
  });

  it("resets repetitions and reviews tomorrow on a failed grade", () => {
    let s = initialSm2(now);
    s = sm2Update(s, 5, now);
    s = sm2Update(s, 5, now);
    s = sm2Update(s, 1, now);
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
  });

  it("never drops the ease factor below 1.3", () => {
    let s = initialSm2(now);
    for (let i = 0; i < 20; i++) s = sm2Update(s, 0, now);
    expect(s.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("sets dueAt intervalDays into the future", () => {
    let s = initialSm2(now);
    s = sm2Update(s, 5, now);
    const due = new Date(s.dueAt).getTime();
    expect(due).toBe(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  });
});

describe("qualityFromAnswer", () => {
  it("grades confidently-wrong answers lowest", () => {
    expect(qualityFromAnswer(false, 0.9, 1000)).toBeLessThan(3);
  });
  it("rewards fast, confident, correct answers with a 5", () => {
    expect(qualityFromAnswer(true, 0.9, 1000)).toBe(5);
  });
});

describe("retrievability", () => {
  it("is 1 immediately after review and decays over time", () => {
    let s = initialSm2(now);
    s = sm2Update(s, 5, now);
    expect(retrievability(s, now)).toBe(1);
    const later = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const r = retrievability(s, later);
    expect(r).toBeLessThan(1);
    expect(r).toBeGreaterThan(0);
  });
});

describe("isDue", () => {
  it("reports due once the interval has elapsed", () => {
    let s = initialSm2(now);
    s = sm2Update(s, 5, now);
    expect(isDue(s, now)).toBe(false);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    expect(isDue(s, tomorrow)).toBe(true);
  });
});
