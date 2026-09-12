import { after } from "next/server";
import { ANALYTICS_APP, type EventName } from "./events";

/**
 * Server-side events: the moments no browser sees (a Stripe webhook, a sign-in callback, a
 * download response). Same shared project and the same `app` property as the client.
 *
 * `distinct_id` is the constant "server" and `$process_person_profile` is false, so these never
 * create or touch a person profile: they are counts, and no user id, email, or slug is sent.
 *
 * Keyless is a supported state, exactly like the client: no key, nothing is sent.
 */

export type ServerEventProperties = Record<string, string | number | boolean>;

type CaptureConfig = { key?: string; host?: string; fetchImpl?: typeof fetch; timeoutMs?: number };

// Fallback only for a deploy where NEXT_PUBLIC_POSTHOG_HOST is unset. The shared ecosystem project
// is US (witus task 52), and a US key against the EU host fails silently, so the host is also set
// explicitly on the Vercel project rather than trusted to this default.
const FALLBACK_HOST = "https://us.i.posthog.com";

/**
 * Sends one event and resolves to whether PostHog accepted it. Never throws: analytics is not
 * worth failing a webhook or a sign-in over.
 */
export async function captureServerEvent(
  event: EventName,
  properties: ServerEventProperties = {},
  config: CaptureConfig = {},
): Promise<boolean> {
  const key = config.key ?? process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return false;
  const host = (config.host || process.env.NEXT_PUBLIC_POSTHOG_HOST || FALLBACK_HOST).replace(/\/+$/, "");
  const fetchImpl = config.fetchImpl ?? fetch;
  try {
    // PostHog's single-event capture endpoint (verified 2026-09-12: POST returns 200 {"status":"Ok"}).
    const response = await fetchImpl(`${host}/i/v0/e/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: "server",
        properties: { ...properties, app: ANALYTICS_APP, $process_person_profile: false },
      }),
      signal: AbortSignal.timeout(config.timeoutMs ?? 2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Fire-and-forget for request handlers: the send runs after the response is on its way, so a
 * slow PostHog never adds latency to a sign-in, a checkout redirect, or a download.
 */
export function trackServerEvent(event: EventName, properties?: ServerEventProperties): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  const send = async () => {
    await captureServerEvent(event, properties);
  };
  try {
    after(send);
  } catch {
    // Outside a request scope (scripts, tests with a key set): send without waiting.
    void send();
  }
}
