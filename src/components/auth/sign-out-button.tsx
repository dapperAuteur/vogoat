"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * GLOBAL SIGN-OUT (BAM, 2026-08-30: "signout signs out of every app"). When `endSessionUrl` is
 * present, signing out of VO GOAT also ends the shared session at accounts.witus.online, so it
 * signs you out of every WitUS app in this browser. The caller resolves the URL on the SERVER
 * (src/lib/env.ts) and passes null when this app is not a registered OIDC client — then sign-out
 * stays purely local and lands on /goodbye exactly as it does today.
 */
export function SignOutButton({ endSessionUrl = null }: { endSessionUrl?: string | null } = {}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        // ORDER IS THE SAFETY PROPERTY. Destroy the LOCAL session first, then hand off. If the IdP
        // is unreachable or refuses the logout, the person is still signed out HERE. Never hand off
        // first: that turns any IdP failure into "I clicked sign out and I'm still signed in".
        void authClient
          .signOut()
          .catch(() => undefined)
          .finally(() => {
            // Hard navigation on purpose in both branches: it lands regardless of router state and
            // replaces any interim redirect a provider might have queued.
            if (endSessionUrl) {
              // Trailing slash is REQUIRED. better-auth exact-matches post_logout_redirect_uri
              // against the client's registered redirectUrls, and gemini/witus registers
              // `https://vogoat.witus.online/` (EcosystemApp.postLogoutPath defaults to "/").
              // Drop the slash and the IdP answers invalid_request.
              const back = `${window.location.origin}/`;
              // `&`, not `?`: endSessionUrl already carries client_id (see src/lib/env.ts).
              // The IdP returns the browser to `back`, so the global path lands on the home page
              // rather than /goodbye — the registered URI is the app origin and nothing else.
              window.location.assign(
                `${endSessionUrl}&post_logout_redirect_uri=${encodeURIComponent(back)}`,
              );
              return;
            }
            // Local-only sign-out keeps the come-back-tomorrow page.
            window.location.assign("/goodbye");
          });
      }}
      className="min-h-11 rounded-md px-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
    >
      {isPending ? "Signing out…" : endSessionUrl ? "Sign out of WitUS" : "Sign out"}
    </button>
  );
}
