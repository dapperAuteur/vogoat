import { expect, test } from "@playwright/test";
import { PLAYER_STATE } from "./env";

/**
 * The paying-nothing critical path: record on a fake microphone, keep the take (the only moment
 * audio is allowed to leave the device, invariant 2), submit it as today's single entry
 * (invariant 1), and find the plate in the Guild.
 *
 * Chromium is launched with a fake media device and the microphone permission is pre-granted
 * (see playwright.config.ts), so getUserMedia and MediaRecorder work headlessly.
 */
test.use({ storageState: PLAYER_STATE });

test("free player records, keeps and submits a take, and the plate lands in the Guild", async ({ page }) => {
  await page.goto("/");
  const creatureName = (await page.getByRole("heading", { level: 1 }).innerText()).trim();

  await page.getByRole("button", { name: /Record a take · Take 1 of 3/ }).click();

  const stop = page.getByRole("button", { name: /^Stop ·/ });
  await expect(stop).toBeVisible();
  // A very short take is enough; the cap is 30s and the floor is "more than zero bytes".
  await page.waitForTimeout(1500);
  await stop.click();

  // Review step: the audio never reached the server yet.
  const keep = page.getByRole("button", { name: "Keep this take" });
  await expect(keep).toBeVisible();
  await keep.click();

  const kept = page.getByRole("region", { name: "Your kept takes" });
  await expect(kept).toBeVisible();
  await expect(kept.getByText("Take 1")).toBeVisible();

  // Kept audio is converted to MP3 on the device before its one upload; the stored file must be
  // a real MP3, not a webm with a new name.
  const href = await kept.getByRole("link", { name: "Download", exact: true }).getAttribute("href");
  const audio = await page.request.get(href as string);
  expect(audio.headers()["content-type"]).toBe("audio/mpeg");
  expect(audio.headers()["content-disposition"]).toContain(".mp3");
  const bytes = await audio.body();
  expect(bytes[0]).toBe(0xff);
  expect(bytes[1] & 0xe0).toBe(0xe0);

  await kept.getByRole("button", { name: "Submit as today's entry" }).click();
  await expect(page.getByText(/Submitted: take 1 of 3\. One entry per day, every tier\./)).toBeVisible();

  await page.goto("/guild");
  await expect(page.getByText("Nothing observed yet.")).toHaveCount(0);
  await expect(page.getByRole("img", { name: creatureName })).toBeVisible();
});
