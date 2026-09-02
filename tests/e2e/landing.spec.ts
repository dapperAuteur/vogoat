import { expect, test } from "@playwright/test";
import { WHEEL_VALUES } from "../../src/lib/game/recipe";

/** The anonymous front door: today's specimen, the recipe, the line, and no account needed. */
test.describe("anonymous landing", () => {
  test("renders today's specimen, all eight wheels, the script and a sign-in link", async ({ page }) => {
    await page.goto("/");

    const specimen = page.getByRole("region", { name: "Today's specimen" });
    await expect(specimen).toBeVisible();
    await expect(specimen.getByText(/^Specimen No\. \d+$/)).toBeVisible();

    // The creature name is the page's h1.
    const name = page.getByRole("heading", { level: 1 });
    await expect(name).toBeVisible();
    expect((await name.innerText()).trim().length).toBeGreaterThan(0);

    // Eight wheels, each showing a value from that wheel's own vocabulary.
    const rows = specimen.getByRole("button");
    await expect(rows).toHaveCount(8);
    const labels: Record<keyof typeof WHEEL_VALUES, string> = {
      effort: "Effort",
      placement: "Place",
      air: "Air",
      age: "Age",
      size: "Size",
      tempo: "Tempo",
      volume: "Volume",
      attitude: "Attitude",
    };
    // Each row reads "<label> <value>"; both halves are single words.
    const shown = new Map(
      (await rows.allInnerTexts()).map((text) => {
        const words = text.trim().split(/\s+/);
        return [words[0], words[words.length - 1]] as const;
      }),
    );
    for (const wheel of Object.keys(labels) as (keyof typeof WHEEL_VALUES)[]) {
      const value = shown.get(labels[wheel]);
      expect(WHEEL_VALUES[wheel] as readonly string[], `wheel ${labels[wheel]}`).toContain(value);
    }

    // The shared micro-script.
    await expect(page.getByText("Read aloud")).toBeVisible();
    const script = page.getByText("Read aloud").locator("xpath=following-sibling::p[1]");
    expect((await script.innerText()).trim().length).toBeGreaterThan(0);

    // Signed out, recording is rehearsal and nothing is counted.
    await expect(page.getByRole("button", { name: /Record a take · Rehearsal \(not counted\)/ })).toBeVisible();
    // Scoped to the page header: the ecosystem footer carries its own Sign in link.
    const header = page.locator("#main > header");
    await expect(header.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Guild" })).toHaveCount(0);
  });
});
