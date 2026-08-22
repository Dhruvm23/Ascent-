import { test, type Page } from "@playwright/test";

/**
 * Captures key screens for the README. Signs in as the mid-journey "climber"
 * so the route map and dashboard are populated. Not an assertion test — it just
 * produces docs/screenshots/*.png.
 */

const DIR = "docs/screenshots";

async function shot(page: Page, name: string) {
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
}

test("capture screenshots", async ({ page }) => {
  // Reduced motion so scroll-reveal content is fully painted in static captures.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForTimeout(1200);
  await shot(page, "landing");

  await page.goto("/signin");
  await shot(page, "signin");

  await page.getByLabel("Email").fill("climber@test.dev");
  await page.getByLabel("Password").fill("summit123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/map/, { timeout: 30_000 });
  await page.waitForTimeout(1500);
  await shot(page, "map");

  // A lesson page for the recommended concept.
  const climb = page.getByRole("link", { name: /climb|review/i }).first();
  if (await climb.isVisible().catch(() => false)) {
    await climb.click();
    await page.waitForURL(/\/learn\//);
    await page.waitForTimeout(2500);
    await shot(page, "lesson");
  }

  await page.goto("/dev/logs");
  await page.waitForTimeout(800);
  await shot(page, "dev-logs");
});
