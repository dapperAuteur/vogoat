import { expect, test } from "@playwright/test";
import { logOffset, readMagicLink } from "./magic-link";

/**
 * The development magic link, driven through the real form: no email service is involved —
 * the mailer prints the link to the dev server's console and the test reads it back.
 */
test("magic-link sign-in lands a session and the header switches to the account", async ({ page }) => {
  const email = "newcomer@example.com";

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

  const offset = logOffset();
  await page.getByLabel("Development sign-in").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText(/Link created/)).toBeVisible();

  await page.goto(await readMagicLink(offset));
  await page.waitForURL("**/");

  const header = page.locator("#main > header");
  await expect(header.getByRole("link", { name: "Guild" })).toBeVisible();
  await expect(header.getByRole("button", { name: "Sign out" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  // A signed-in visitor's takes are counted; the rehearsal wording is gone.
  await expect(page.getByRole("button", { name: /Record a take · Take 1 of 3/ })).toBeVisible();

  // Signing in is not admin: this account is not ADMIN_EMAIL.
  await expect(header.getByRole("link", { name: "Admin" })).toHaveCount(0);
});
