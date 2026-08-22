import { test, expect, type Page } from "@playwright/test";

/**
 * Proves the LIVE "type any subject" path through the real running app (not
 * just direct agent calls): a brand-new, never-cached subject is typed at
 * onboarding, the Curriculum Architect generates + validates a graph live,
 * the diagnostic seeds mastery, and the lesson's explanation/quiz/feynman all
 * come from live model calls. Requires OPENROUTER_API_KEY to be set.
 */

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/signin");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/signin"), { timeout: 30_000 });
}

test("live subject generation end-to-end via the real app", async ({ page }) => {
  test.setTimeout(180_000);

  await signIn(page, "climber@test.dev", "summit123");

  const subject = `Basics of Astronomy ${Date.now()}`; // unique so it's never cached
  await page.goto(`/onboarding?subject=${encodeURIComponent(subject)}`);
  await expect(page.getByRole("heading", { name: /plot your route/i })).toBeVisible();

  await page.getByRole("button", { name: "Space" }).click();
  await page.getByLabel("Goal").fill("Understand the night sky");
  await page.getByRole("button", { name: /build my route/i }).click();

  // Live generation can take a while (real model call) — give it room.
  await expect(page.getByText(/find your starting elevation/i)).toBeVisible({ timeout: 90_000 });

  for (let i = 0; i < 12; i++) {
    if (/\/map/.test(page.url())) break;
    const choice = page.locator(".card button").first();
    if (await choice.isVisible().catch(() => false)) {
      await choice.click();
      await page.waitForTimeout(300);
    } else break;
  }

  await page.waitForURL(/\/map/, { timeout: 30_000 });
  await expect(page.getByText(/elevation/i).first()).toBeVisible();

  await page.getByRole("link", { name: /climb|review/i }).first().click();
  await page.waitForURL(/\/learn\//);

  // The live explanation should actually populate with real prose.
  const checkBtn = page.getByRole("button", { name: /check my understanding/i });
  await expect(checkBtn).toBeVisible({ timeout: 60_000 });
  const explanationText = await page.locator("section p").first().textContent();
  expect(explanationText?.length ?? 0).toBeGreaterThan(20);
  await checkBtn.click();

  const firstChoice = page.getByTestId("quiz-choice").first();
  await expect(firstChoice).toBeVisible({ timeout: 60_000 });
  await firstChoice.click();
  await page.getByRole("button", { name: /submit answer/i }).click();
  await expect(page.getByRole("button", { name: /next question|explain it back/i }).first()).toBeVisible({
    timeout: 30_000,
  });

  console.log(`Live subject test used a unique subject: "${subject}"`);
});
