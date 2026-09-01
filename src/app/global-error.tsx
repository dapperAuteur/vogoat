"use client";

import { useEffect } from "react";
import { reportClientErrorAction } from "@/app/actions/errors";

/** Root-layout failure: own html/body, inline styles (the stylesheet may be the casualty). */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void reportClientErrorAction({
      digest: error.digest,
      message: `${error.name}: ${error.message}`.slice(0, 500),
      path: typeof window !== "undefined" ? window.location.pathname : "unknown",
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#f7f3ea", color: "#0f172a", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", padding: "48px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ fontStyle: "italic", fontSize: 28, margin: 0 }}>VO GOAT hit a snag.</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "#475569", margin: 0 }}>
            The whole page failed to load and the error has been reported automatically.
            {error.digest ? ` Reference: ${error.digest}.` : ""}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{ minHeight: 48, borderRadius: 8, background: "#3f6212", color: "#fff", fontWeight: 600, border: 0, cursor: "pointer" }}
          >
            Try again
          </button>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- the root layout
              (and with it the router context Link needs) just crashed; a hard navigation is the point */}
          <a
            href="/"
            style={{ minHeight: 48, borderRadius: 8, border: "1px solid #0f172a", color: "#0f172a", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
          >
            Back to today&apos;s recipe
          </a>
        </main>
      </body>
    </html>
  );
}
