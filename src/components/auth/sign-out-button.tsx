"use client";

import { useId, useState } from "react";
import { authClient } from "@/lib/auth-client";
import {
  SIGN_OUT_EVERYWHERE_HELP,
  SIGN_OUT_EVERYWHERE_LABEL,
  SIGN_OUT_LABEL,
  SIGN_OUT_PENDING_LABEL,
  signOutEverywhere,
  signOutHere,
} from "@/lib/sign-out";

// Hard navigation on purpose for both controls: it lands regardless of router state and replaces
// any interim redirect a provider might have queued.
const hardNavigate = (url: string) => window.location.assign(url);

/**
 * "Sign out": ends ONLY the VO GOAT session, then /goodbye (BAM, 2026-10-29, witus task 128
 * option (b)). It never navigates to the IdP, so the WitUS session and other WitUS apps stay
 * signed in. Its label is always "Sign out" (shared UI rule: the header sign-in/out control is
 * never renamed). Ending the WitUS session is `SignOutEverywhereButton`'s job.
 */
export function SignOutButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        void signOutHere({ signOut: () => authClient.signOut(), navigate: hardNavigate });
      }}
      className="min-h-11 shrink-0 rounded-md px-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
    >
      {isPending ? SIGN_OUT_PENDING_LABEL : SIGN_OUT_LABEL}
    </button>
  );
}

/**
 * "Sign out of WitUS everywhere": ends the VO GOAT session, THEN ends the WitUS session at the IdP
 * (order in `signOutEverywhere`, src/lib/sign-out.ts). Other WitUS apps stay signed in until you
 * sign out of them; the help text says so.
 *
 * The caller resolves `endSessionUrl` on the SERVER (src/lib/env.ts) and passes null when this
 * app is not a registered OIDC client; then nothing renders.
 */
export function SignOutEverywhereButton({ endSessionUrl }: { endSessionUrl: string | null }) {
  const helpId = useId();
  const [isPending, setIsPending] = useState(false);
  if (!endSessionUrl) return null;

  return (
    <div className="flex items-baseline justify-end gap-3">
      <p id={helpId} className="text-[11px] leading-snug text-muted">
        {SIGN_OUT_EVERYWHERE_HELP}
      </p>
      <button
        type="button"
        disabled={isPending}
        aria-describedby={helpId}
        onClick={() => {
          setIsPending(true);
          void signOutEverywhere({
            signOut: () => authClient.signOut(),
            navigate: hardNavigate,
            endSessionUrl,
            origin: window.location.origin,
          });
        }}
        className="min-h-11 shrink-0 rounded-md px-2 text-xs font-semibold text-muted underline underline-offset-4 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
      >
        {isPending ? SIGN_OUT_PENDING_LABEL : SIGN_OUT_EVERYWHERE_LABEL}
      </button>
    </div>
  );
}
