import { describe, it, expect } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit then blocks", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 10_000).ok).toBe(true);
    expect(rateLimit(key, 3, 10_000).ok).toBe(true);
    expect(rateLimit(key, 3, 10_000).ok).toBe(true);
    const blocked = rateLimit(key, 3, 10_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    expect(rateLimit(a, 1, 10_000).ok).toBe(true);
    expect(rateLimit(a, 1, 10_000).ok).toBe(false);
    expect(rateLimit(b, 1, 10_000).ok).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `w-${Math.random()}`;
    expect(rateLimit(key, 1, 20).ok).toBe(true);
    expect(rateLimit(key, 1, 20).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(rateLimit(key, 1, 20).ok).toBe(true);
  });
});
