"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        // Hard navigation on purpose: it lands on the come-back-tomorrow page regardless of
        // router state, and replaces any interim redirect a provider might have queued.
        void authClient
          .signOut()
          .catch(() => undefined)
          .finally(() => {
            window.location.assign("/goodbye");
          });
      }}
      className="min-h-11 rounded-md px-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
    >
      {isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
