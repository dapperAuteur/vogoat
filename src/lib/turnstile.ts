import { env } from "./env";

/**
 * Server-side Turnstile verification (PRD §11: anonymous-adjacent surfaces). Degrades open
 * until TURNSTILE_SECRET_KEY exists (task 01 step 7) so the report form never breaks first.
 */
export async function verifyTurnstile(token: string | null, ip: string | null): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (error: unknown) {
    console.error("[turnstile] verify failed:", error instanceof Error ? error.constructor.name : "unknown");
    return false;
  }
}
