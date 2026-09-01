"use client";

import posthog from "posthog-js";

// PostHog carries the §15 measures; inert without the key. Ingest rides our own origin
// (/ingest rewrite) so content blockers have nothing to match on.
let initialized = false;

export function initAnalytics(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || initialized) return;
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    capture_pageview: true,
    autocapture: false,
    persistence: "localStorage+cookie",
  });
  initialized = true;
}

/** §15 funnel events; no-op until initialized. Never send audio or free-text. */
export function track(event: "take_registered" | "take_kept" | "take_submitted" | "share_created", properties?: Record<string, number | string | boolean>): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function trackPageview(path: string): void {
  if (!initialized) return;
  posthog.capture("$pageview", { $current_url: window.location.origin + path });
}
