import fs from "node:fs";
import type { Page } from "@playwright/test";
import { BASE_URL, SERVER_LOG } from "./env";

/**
 * Development sign-in without any email service: better-auth's magic-link plugin hands the URL
 * to the mailer, which (with no Mailgun keys) prints it to the dev server's stdout. Global setup
 * pipes that stdout to SERVER_LOG, so a test can read the link back out of the log.
 */

const LINK = /http:\/\/localhost:\d+\/api\/auth\/magic-link\/verify\?\S+/g;

/** Byte offset to read the log from, captured before the link is requested. */
export function logOffset(): number {
  try {
    return fs.statSync(SERVER_LOG).size;
  } catch {
    return 0;
  }
}

/** Asks the server for a magic link. `name` is optional; better-auth stores "" without it. */
export async function requestMagicLink(email: string, name?: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/sign-in/magic-link`, {
    method: "POST",
    // better-auth rejects a cross-origin-looking POST without an Origin header.
    headers: { "content-type": "application/json", origin: BASE_URL },
    body: JSON.stringify({ email, callbackURL: "/", ...(name ? { name } : {}) }),
  });
  if (!response.ok) {
    throw new Error(`magic-link request failed: ${response.status} ${await response.text()}`);
  }
}

/** Polls the dev-server log for the verify URL printed after `offset`. */
export async function readMagicLink(offset: number, timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    let tail = "";
    try {
      const size = fs.statSync(SERVER_LOG).size;
      if (size > offset) {
        const fd = fs.openSync(SERVER_LOG, "r");
        const buffer = Buffer.alloc(size - offset);
        fs.readSync(fd, buffer, 0, buffer.length, offset);
        fs.closeSync(fd);
        tail = buffer.toString("utf8");
      }
    } catch {
      // The log may not exist for a moment; keep polling.
    }
    const matches = tail.match(LINK);
    if (matches && matches.length > 0) return matches[matches.length - 1];
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`no magic link appeared in ${SERVER_LOG} within ${timeoutMs}ms`);
}

/** Request a link, then follow it in this page's context so the session cookie lands there. */
export async function signInAs(page: Page, email: string, name?: string): Promise<void> {
  const offset = logOffset();
  await requestMagicLink(email, name);
  const url = await readMagicLink(offset);
  await page.goto(url);
  await page.waitForURL(`${BASE_URL}/`);
}
