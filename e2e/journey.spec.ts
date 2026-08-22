import { test, expect, type Page } from "@playwright/test";

/**
 * The whole connected loop, as a judge would exercise it:
 *   sign in → onboarding (subject + interests + mode + goal) → adaptive
 *   diagnostic → route map → lesson (explanation → quiz → explain-it-back) →
 *   graph updates → planner re-routes.
 *
 * Uses the fresh seeded learner and the cached "Music Theory Fundamentals"
 * course (so it passes with or without a live OpenRouter key — curriculum
 * generation is cache-first, but the tutor/quiz/feynman calls below still hit
 * the live model chain whenever a key is configured, so timeouts are sized
 * for real model latency, not just the instant static fallback).
 */

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test("full learning journey from onboarding to an updated route", async ({ page }) => {
  test.setTimeout(150_000);
  await signIn(page, "learner@test.dev", "climbing123");

  // Signed in once we leave the sign-in page (fresh learners route to onboarding).
  await page.waitForURL((url) => !url.pathname.includes("/signin"), { timeout: 30_000 });
  await page.goto("/onboarding?subject=Music%20Theory%20Fundamentals");

  await expect(page.getByRole("heading", { name: /plot your route/i })).toBeVisible();

  // Pick an interest and a goal, keep the default mode.
  await page.getByRole("button", { name: "Basketball" }).click();
  await page.getByLabel("Goal").fill("Write my own songs");
  await page.getByRole("button", { name: /build my route/i }).click();

  // Adaptive diagnostic: answer whatever the first choice is until it finishes.
  await expect(page.getByText(/find your starting elevation/i)).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < 12; i++) {
    if (/\/map/.test(page.url())) break;
    const choice = page.locator(".card button").first();
    if (await choice.isVisible().catch(() => false)) {
      await choice.click();
      await page.waitForTimeout(300);
    } else {
      break;
    }
  }

  // Arrive at the route map.
  await page.waitForURL(/\/map/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: /music theory/i })).toBeVisible();
  await expect(page.getByText(/elevation/i).first()).toBeVisible();

  // Start the recommended next concept.
  await page.getByRole("link", { name: /climb|review/i }).first().click();
  await page.waitForURL(/\/learn\//);

  // Explanation streams from a live model (or falls back) — then check understanding.
  await expect(page.getByRole("button", { name: /check my understanding/i })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /check my understanding/i }).click();

  // Quiz: answer the first choice, submit, read feedback, continue. There may
  // be more than one question — loop until we reach the explain-it-back step.
  // Timeouts are generous: a real model call plus a schema-mismatch retry to
  // the next model in the chain can legitimately take 30-40s.
  for (let q = 0; q < 4; q++) {
    const choice = page.getByTestId("quiz-choice").first();
    await expect(choice).toBeVisible({ timeout: 60_000 });
    await choice.click();
    await page.getByRole("button", { name: /submit answer/i }).click();
    const advance = page.getByRole("button", { name: /next question|explain it back/i }).first();
    await expect(advance).toBeVisible({ timeout: 45_000 });
    const label = (await advance.textContent()) ?? "";
    await advance.click();
    if (/explain it back/i.test(label)) break;
  }

  // Explain-it-back (Feynman) — graded live.
  await page.getByLabel(/explain/i).fill(
    "Notes are the named pitches that repeat every octave, the basic alphabet of music.",
  );
  await page.getByRole("button", { name: /submit explanation/i }).click();
  await expect(page.getByRole("button", { name: /finish waypoint/i })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: /finish waypoint/i }).click();

  // The waypoint-logged panel confirms the Cognitive Fingerprint updated, then
  // routes back to the map.
  await expect(page.getByText(/cognitive fingerprint updated/i)).toBeVisible();
  await page.getByRole("button", { name: /see your updated route/i }).click();

  // Back on the map with an updated graph.
  await page.waitForURL(/\/map/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: /music theory/i })).toBeVisible();
});
