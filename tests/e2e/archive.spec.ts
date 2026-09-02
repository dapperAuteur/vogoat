import { expect, test } from "@playwright/test";
import { dayKeyAgo } from "./env";
import { WHEEL_VALUES } from "../../src/lib/game/recipe";

/**
 * The public archive. Global setup back-fills two past dailies (tests/e2e/seed-archive.ts) using
 * the app's own assembler, so these are ordinary rows.
 */
test.describe("archive", () => {
  test("/archive lists past specimens and never today's", async ({ page }) => {
    await page.goto("/archive");
    await expect(page.getByRole("heading", { name: "Every specimen so far." })).toBeVisible();

    const yesterday = dayKeyAgo(1);
    const entries = page.getByRole("listitem");
    await expect(entries.filter({ hasText: yesterday })).toHaveCount(1);
    await expect(page.getByRole("link", { name: new RegExp(dayKeyAgo(0)) })).toHaveCount(0);
    await expect(page.getByText("The first specimen is still out there.")).toHaveCount(0);
  });

  test("/day/<date> renders that day's specimen, recipe and line", async ({ page }) => {
    const yesterday = dayKeyAgo(1);
    const response = await page.goto(`/day/${yesterday}`);
    expect(response?.status()).toBe(200);

    const article = page.getByRole("article");
    await expect(article.getByText(yesterday)).toBeVisible();
    const name = page.getByRole("heading", { level: 1 });
    expect((await name.innerText()).trim().length).toBeGreaterThan(0);
    await expect(page.getByRole("img", { name: (await name.innerText()).trim() })).toBeVisible();

    const rows = article.getByRole("button");
    await expect(rows).toHaveCount(8);
    const values = (await rows.allInnerTexts()).map((t) => t.trim().split(/\s+/).pop());
    const vocabulary = Object.values(WHEEL_VALUES).flat() as string[];
    for (const value of values) expect(vocabulary).toContain(value);

    await expect(page.getByText("The line everyone read")).toBeVisible();
  });

  test("today's day page is not public yet", async ({ page }) => {
    // Soft 404: `force-dynamic` streams the shell before `notFound()` runs, so the status is
    // 200 and the not-found page is the body. The body is what this asserts.
    await page.goto(`/day/${dayKeyAgo(0)}`);
    await expect(page.getByRole("heading", { name: "Not observed." })).toBeVisible();
  });
});
