import { defineConfig, devices } from "@playwright/test";
import { ARTIFACT_DIR, BASE_URL } from "./tests/e2e/env";
import path from "node:path";

/**
 * End-to-end + accessibility sweep. `tests/e2e/global-setup.ts` seeds the embedded database and
 * runs `next dev` itself (see the comment there for why it is not Playwright's `webServer`).
 *
 * `channel: "chromium"` is deliberate: the default headless shell cannot encode audio, and the
 * record/keep/submit flow needs a working MediaRecorder on the fake microphone.
 *
 * @playwright/test is pinned to an exact version in package.json on purpose: 1.62 dropped
 * browser builds for macOS 13 ("Playwright does not support chromium on mac13"), which is the
 * development machine this suite has to run on. Bump it deliberately, not by caret drift.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: path.join(ARTIFACT_DIR, "results"),
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  // One worker: the app runs on a single embedded database and a dev server that compiles
  // routes on demand; serial keeps the suite reliable rather than fast.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { outputFolder: path.join(ARTIFACT_DIR, "report"), open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "off",
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chromium" } }],
});
