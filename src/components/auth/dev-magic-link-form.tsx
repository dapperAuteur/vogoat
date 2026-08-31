"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

/** Development only: the sign-in link is printed to the dev server's console by the mailer. */
export function DevMagicLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("sending");
        void authClient.signIn
          .magicLink({ email, callbackURL: "/" })
          .then((result) => setStatus(result.error ? "error" : "sent"))
          .catch(() => setStatus("error"));
      }}
    >
      <label htmlFor="dev-email" className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        Development sign-in
      </label>
      <input
        id="dev-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
        className="min-h-12 rounded-md border border-rule bg-card px-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 rounded-md border border-ink px-4 font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "sent" ? (
        <p role="status" aria-live="polite" className="text-xs text-muted">
          Link created. It prints in the dev server console; open it to sign in.
        </p>
      ) : null}
      {status === "error" ? (
        <p role="alert" className="text-xs text-ochre">
          That did not work. Check the dev server console for details.
        </p>
      ) : null}
    </form>
  );
}
