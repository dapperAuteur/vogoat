import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ANALYTICS_APP, EVENTS, SHARED_EVENTS } from "@/lib/analytics/events";
import { captureServerEvent } from "@/lib/analytics/server";

describe("event taxonomy", () => {
  it("uses the identity slug from the WitUS client registry", () => {
    expect(ANALYTICS_APP).toBe("vogoat");
  });

  it("keeps the contractual shared sign-in names", () => {
    expect(SHARED_EVENTS).toEqual({
      signinStarted: "signin_started",
      signinSucceeded: "signin_succeeded",
      signinFailed: "signin_failed",
    });
  });

  it("names every event snake_case, unique, and without the app name", () => {
    const names = Object.values(EVENTS);
    expect(new Set(names).size).toBe(names.length);
    for (const name of names) {
      expect(name).toMatch(/^[a-z]+(_[a-z]+)+$/);
      expect(name).not.toMatch(/vo_?goat/);
    }
  });
});

describe("client init conforms to the ecosystem standard", () => {
  const provider = readFileSync("src/lib/analytics/posthog-provider.tsx", "utf8");
  it.each([
    [/autocapture:\s*false/],
    [/disable_session_recording:\s*true/],
    [/persistence:\s*["']memory["']/],
    [/capture_pageview:\s*false/],
    [/register\(\s*\{\s*app:/],
  ])("sets %s", (pattern) => {
    expect(provider).toMatch(pattern);
  });

  it("mounts through the first-party /ingest proxy", () => {
    expect(readFileSync("src/app/layout.tsx", "utf8")).toMatch(/apiHost="\/ingest"/);
    expect(readFileSync("next.config.ts", "utf8")).toMatch(/us\.i\.posthog\.com/);
  });
});

describe("captureServerEvent", () => {
  it("sends nothing without a key", async () => {
    const fetchImpl = vi.fn();
    expect(await captureServerEvent(EVENTS.purchaseCompleted, {}, { key: "", fetchImpl })).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts an app-tagged, profile-free event to the capture endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('{"status":"Ok"}', { status: 200 }));
    const sent = await captureServerEvent(
      EVENTS.purchaseCompleted,
      { kind: "lifetime", method: "stripe" },
      { key: "phc_test", host: "https://us.i.posthog.com/", fetchImpl },
    );
    expect(sent).toBe(true);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://us.i.posthog.com/i/v0/e/");
    expect(JSON.parse(init.body)).toEqual({
      api_key: "phc_test",
      event: "purchase_completed",
      distinct_id: "server",
      properties: { kind: "lifetime", method: "stripe", app: "vogoat", $process_person_profile: false },
    });
  });

  it("swallows network failures", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("offline"));
    expect(await captureServerEvent(EVENTS.signinFailed, {}, { key: "phc_test", fetchImpl })).toBe(false);
  });
});
