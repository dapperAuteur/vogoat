import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * Accessibility sweep of the public surfaces. Serious and critical violations fail the run;
 * everything below that is printed and attached so it can be triaged without being ignored.
 */
const PAGES = ["/", "/about", "/voice-data", "/upgrade", "/archive", "/sign-in"];

/** The ecosystem footer's Rise Wellness partner block. */

/**
 * KNOWN, UNFIXED APP DEFECT — reported, deliberately not patched from the test suite.
 *
 * The partner callout in the shared footer prints its microcopy in Tailwind's `text-gray-500`
 * (#6b7280) on the Field Guide card colour `#f7f3ea`. That is roughly 4.4:1, just under the
 * 4.5:1 AA floor for normal-size text, so axe reports `color-contrast` (serious) on every page.
 * The block is verbatim partner copy per the ecosystem footer recipe, so the fix is a palette
 * decision for that recipe, not something a test should paper over locally.
 *
 * The allowance is scoped to nodes INSIDE that callout and to that one rule: any new contrast
 * failure anywhere else on the page still fails the run. Delete this once the footer is fixed.
 */
type AxePage = ConstructorParameters<typeof AxeBuilder>[0]["page"];

/** axe-core is a transitive dependency, so the result shape is derived rather than imported. */
type AxeViolation = Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"][number];

function describeViolation(path: string, v: AxeViolation): string {
  return `[axe] ${path} · ${v.id} · ${v.impact ?? "unknown"} · ${v.nodes.length} node(s) · ${v.help}`;
}

async function scan(page: Page, info: TestInfo, path: string): Promise<void> {
  // The Field Guide reveals its rows with a staggered fade; globals.css turns that off under
  // prefers-reduced-motion. Honouring it makes the scan deterministic, because text caught
  // mid-fade reports contrast failures that do not exist once the page has settled.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path);
  await expect(page.locator("#main")).toBeVisible();
  // Belt and braces: never measure a page that is still animating.
  await page
    .waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, { timeout: 10_000 })
    .catch(() => undefined);

  // @axe-core/playwright resolves its own copy of playwright-core, so its Page type is
  // nominally different from the test runner's. Structurally identical; cast once, here.
  const results = await new AxeBuilder({ page: page as unknown as AxePage })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"])
    // axe descends into frames, and the YouTube embed on /about reports ARIA problems inside
    // the player's own markup (aria-allowed-attr, aria-prohibited-attr) that this codebase
    // cannot fix. Only that third-party player is excluded; the app's own frames are scanned.
    .exclude('iframe[src*="youtube.com"]')
    .analyze();

  // Everything axe found is printed, including the impacts that do not fail the run.
  for (const v of results.violations) {
    console.log(describeViolation(path, v));
    for (const node of v.nodes) {
      const data = node.any[0]?.data as { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string } | undefined;
      const detail = data?.contrastRatio
        ? ` — ${data.fgColor} on ${data.bgColor}, ${data.contrastRatio}:1 (needs ${data.expectedContrastRatio})`
        : "";
      console.log(`        ${node.target.join(" ")}${detail}`);
    }
  }
  if (results.violations.length > 0) {
    await info.attach(`axe${path.replace(/\W+/g, "-") || "-root"}.json`, {
      body: JSON.stringify(results.violations, null, 2),
      contentType: "application/json",
    });
  }

  const blocking: string[] = [];
  for (const v of results.violations) {
    if (v.impact !== "serious" && v.impact !== "critical") continue;
    // No exceptions: the footer's partner callout used to miss 4.5:1 and was excused here.
    // Its muted greys were darkened instead, so any serious violation now fails the run.
    blocking.push(`${v.id} (${v.impact}): ${v.nodes.map((node) => node.target.join(" ")).join(", ")}`);
  }

  const lesser = results.violations.filter((v) => v.impact !== "serious" && v.impact !== "critical");
  expect(
    blocking,
    `serious/critical accessibility violations on ${path} (${lesser.length} lesser violation(s) logged above)`,
  ).toEqual([]);
}

for (const path of PAGES) {
  test(`no serious or critical accessibility violations on ${path}`, async ({ page }, info) => {
    await scan(page, info, path);
  });
}
