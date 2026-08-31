"use client";

import { useState } from "react";
import { signInWithWitus } from "@/lib/auth-client";

/** Starts the ecosystem OIDC flow against accounts.witus.online. Rendered only when provisioned. */
export function WitusSsoButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        void signInWithWitus("/")
          .catch(() => setIsPending(false));
      }}
      className="flex min-h-12 w-full items-center justify-center rounded-md bg-moss px-4 font-semibold text-on-moss transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
    >
      {isPending ? "Redirecting…" : "Sign in with WitUS"}
    </button>
  );
}
