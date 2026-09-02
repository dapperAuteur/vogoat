import { expect, test } from "@playwright/test";
import { ADMIN_STATE, PLAYER_STATE } from "./env";

/** Invariant 7: admin is whoever signs in as ADMIN_EMAIL; everyone else gets a 404, not a 403. */

test.describe("a signed-in player", () => {
  test.use({ storageState: PLAYER_STATE });

  for (const path of ["/admin", "/admin/scripts"]) {
    test(`${path} is not found`, async ({ page }) => {
      // The body is the assertion, not the status code: these are `force-dynamic` pages, so
      // Next streams the shell before `notFound()` runs and the response is a soft 404 (HTTP
      // 200 carrying the not-found page). Reported as an app finding, not fixed here.
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Not observed." })).toBeVisible();
      await expect(page.getByRole("link", { name: /Script triage/ })).toHaveCount(0);
    });
  }
});

test.describe("the ADMIN_EMAIL account", () => {
  test.use({ storageState: ADMIN_STATE });

  test("/admin renders the console and links to script triage", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(200);
    await expect(page.locator("#main > header").getByText("Admin")).toBeVisible();
    await expect(page.getByRole("link", { name: /Script triage/ })).toBeVisible();
  });

  test("/admin/scripts renders the triage ritual", async ({ page }) => {
    const response = await page.goto("/admin/scripts");
    expect(response?.status()).toBe(200);
    await expect(page.locator("#main > header").getByText("Script triage")).toBeVisible();
    await expect(page.getByText(/still undecided/)).toBeVisible();
  });
});
