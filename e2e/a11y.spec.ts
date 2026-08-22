import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated WCAG audit with axe-core. We fail the build on serious/critical
 * violations on the public pages. The JSON is written to axe-report.json as
 * evidence to cite in the README.
 */

const PAGES = [
  { name: "landing", path: "/" },
  { name: "signin", path: "/signin" },
  { name: "signup", path: "/signup" },
];

for (const p of PAGES) {
  test(`a11y: ${p.name} has no serious or critical violations`, async ({ page }, testInfo) => {
    await page.goto(p.path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    await testInfo.attach(`axe-${p.name}.json`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    });

    const serious = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    if (serious.length) {
      console.log(`\n[a11y] ${p.name} serious/critical violations:`);
      for (const v of serious) console.log(` - ${v.id}: ${v.help} (${v.nodes.length} nodes)`);
    }
    expect(serious, `${p.name} should have no serious/critical a11y violations`).toEqual([]);
  });
}
