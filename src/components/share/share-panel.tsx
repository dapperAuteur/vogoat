"use client";

import { useState } from "react";
import { createShareAction, revokeShareAction } from "@/app/actions/share";

type Props = {
  takeId: string;
  /** The spoiler-free text card, without a link. */
  cardText: string;
  siteUrl: string;
  /** Active share slug, if one exists. */
  slug: string | null;
};

/** Share is pull, not push: copy the card, or mint a revocable audio link. */
export function SharePanel({ takeId, cardText, siteUrl, slug: initialSlug }: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"card" | "link" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = slug ? `${siteUrl}/s/${slug}` : null;

  async function copy(text: string, kind: "card" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
    } catch {
      setError("Could not reach the clipboard; select and copy the text below.");
    }
  }

  async function mint() {
    setBusy(true);
    setError(null);
    const result = await createShareAction(takeId);
    if (result.ok) setSlug(result.data.slug);
    else setError(result.error);
    setBusy(false);
  }

  async function revoke() {
    setBusy(true);
    setError(null);
    const result = await revokeShareAction(takeId);
    if (result.ok) setSlug(null);
    else setError(result.error);
    setBusy(false);
  }

  const fullCard = `${cardText} · ${shareUrl ?? siteUrl}`;

  return (
    <section className="flex flex-col gap-2 rounded-md border border-rule bg-card p-4" aria-label="Share">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Share</p>
      <p className="rounded-sm bg-paper p-2 font-mono text-xs leading-relaxed break-all">{fullCard}</p>
      <button
        type="button"
        onClick={() => copy(fullCard, "card")}
        className="min-h-12 rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        {copied === "card" ? "Copied" : "Copy card"}
      </button>
      {shareUrl ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => copy(shareUrl, "link")}
              className="min-h-11 flex-1 rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              {copied === "link" ? "Copied" : "Copy audio link"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={revoke}
              className="min-h-11 flex-1 rounded-md border border-ochre text-sm font-semibold text-ochre focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
            >
              {busy ? "Working…" : "Revoke link"}
            </button>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Anyone with the link can hear this take until you revoke it. Revoking kills the old
            link for good; sharing again mints a fresh one.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={busy}
            onClick={mint}
            className="min-h-11 rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
          >
            {busy ? "Working…" : "Create audio link (optional)"}
          </button>
          <p className="text-xs leading-relaxed text-muted">
            Off by default. The card above spoils nothing; the audio link is unguessable,
            unlisted, and yours to revoke.
          </p>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-xs text-ochre">
          {error}
        </p>
      ) : null}
    </section>
  );
}
