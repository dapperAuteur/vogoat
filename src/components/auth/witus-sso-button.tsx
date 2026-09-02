"use client";

import { useEffect, useState } from "react";
import { signInWithWitus } from "@/lib/auth-client";
import {
  SILENT_SSO_TIMEOUT_MS,
  SSO_ATTEMPT_STORAGE_KEY,
  continueAsLabel,
  parseSilentSsoIdentity,
  silentSsoDecision,
  type SsoIdentity,
} from "@/lib/silent-sso";

/**
 * Starts the ecosystem OIDC flow against accounts.witus.online. Rendered only when provisioned.
 *
 * WHAT THE VISITOR SEES. The page is already painted; nothing here delays it. The button reads
 * "Sign in with WitUS" from the first frame. If the silent probe finds a live WitUS session it
 * becomes "Continue as <name>" — same button, same click, no layout shift. If the probe fails,
 * times out, or the browser blocks the IdP's third-party cookie (Safari ITP, Firefox TCP — the
 * common case), nothing changes and nothing is said. A failed silent check is invisible.
 *
 * THE NAME IS DISPLAY COPY, NEVER A CREDENTIAL. It arrives from a cross-origin response, so it is
 * client-supplied by definition. It grants nothing: the click runs the real OIDC code flow, which
 * is where identity is actually established. See src/lib/silent-sso.ts.
 */
export function WitusSsoButton({ silentCheckUrl }: { silentCheckUrl: string | null }) {
  const [isPending, setIsPending] = useState(false);
  const [identity, setIdentity] = useState<SsoIdentity | null>(null);

  useEffect(() => {
    const endpoint = silentCheckUrl;
    const decision = silentSsoDecision({
      endpoint,
      search: window.location.search,
      attempted: readAttempted(),
    });
    // `!endpoint` is implied by decision.attempt; repeated so the narrowing is the compiler's and
    // not a cast that could quietly outlive the invariant.
    if (!decision.attempt || !endpoint) return;

    // Abort rather than hang: a probe still in flight after the visitor has moved on is a leak of
    // attention, not just of a socket.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SILENT_SSO_TIMEOUT_MS);
    let live = true;

    // `credentials: "include"` is the entire mechanism — the answer depends on the IdP's OWN
    // cookie, which is third-party from here. Browsers that partition or block third-party cookies
    // answer "nobody", which is a supported outcome, not a bug to work around.
    fetch(endpoint, {
      credentials: "include",
      mode: "cors",
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (!live) return;
        const found = parseSilentSsoIdentity(payload);
        if (found) setIdentity(found);
      })
      .catch(() => {
        // Invisible on purpose: network error, CORS refusal, abort, non-JSON body — all the same.
      })
      .finally(() => clearTimeout(timer));

    return () => {
      live = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [silentCheckUrl]);

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setIsPending(true);
          // THE LOOP GUARD, written BEFORE the redirect and never after the return. Without it a
          // visitor whose IdP session has gone stale gets: probe says "Continue as X" → click →
          // the IdP cannot finish → back to /sign-in → probe says "Continue as X" → forever. With
          // it, one attempt per tab; the second render offers the plain button, which always works.
          // The other half of the guard is the `?sso=tried` marker the callback shim adds, for
          // browsers where sessionStorage is unavailable.
          writeAttempted();
          void signInWithWitus("/").catch(() => setIsPending(false));
        }}
        className="flex min-h-12 w-full items-center justify-center rounded-md bg-moss px-4 font-semibold text-on-moss transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
      >
        {isPending ? "Redirecting…" : continueAsLabel(identity)}
      </button>
      {/* Always in the DOM so the label change is announced when it happens, and silent (and
          invisible) when the probe found nothing. */}
      <p
        role="status"
        aria-live="polite"
        className={identity ? "-mt-1 text-center text-xs leading-relaxed text-muted" : "sr-only"}
      >
        {identity ? "Not you? Signing in still asks WitUS who you are." : ""}
      </p>
    </>
  );
}

/**
 * sessionStorage throws outright in some privacy modes, so both halves are wrapped. A browser that
 * cannot remember the attempt still gets the `?sso=tried` half of the guard.
 */
function readAttempted(): boolean {
  try {
    return window.sessionStorage.getItem(SSO_ATTEMPT_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAttempted(): void {
  try {
    window.sessionStorage.setItem(SSO_ATTEMPT_STORAGE_KEY, "1");
  } catch {
    // No storage, no marker. The query-param half still applies.
  }
}
