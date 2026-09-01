"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientErrorAction } from "@/app/actions/errors";

/** Route-level failure: report it (digest links user-visible to server cause), offer the way back. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void reportClientErrorAction({
      digest: error.digest,
      message: `${error.name}: ${error.message}`.slice(0, 500),
      path: window.location.pathname,
    }).catch(() => undefined);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-8">
      <h1 className="font-display text-3xl leading-tight italic">That did not work.</h1>
      <p role="alert" className="text-sm leading-relaxed text-muted">
        Something failed on our side and it has been reported automatically. Your takes are
        safe; audio never uploads unless you keep it.
        {error.digest ? ` Reference: ${error.digest}.` : ""}
      </p>
      <button
        type="button"
        onClick={reset}
        className="min-h-12 rounded-md bg-moss px-4 font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Try again
      </button>
      <Link
        href="/"
        className="flex min-h-12 items-center justify-center rounded-md border border-ink font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Back to today&apos;s recipe
      </Link>
    </main>
  );
}
