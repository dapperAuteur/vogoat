"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        // Land on the landing page after the session clears, and refresh so the server
        // re-renders the signed-out header (a refresh alone can leave the old page in place).
        void authClient
          .signOut()
          .then(() => {
            router.push("/");
            router.refresh();
          })
          .finally(() => setIsPending(false));
      }}
      className="min-h-11 rounded-md px-2 text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
