import Link from "next/link";

/**
 * The voice-data promise, loud (BAM, 2026-09-10: "bold and easy to see"). It lived on the old
 * landing placeholder and was lost when the reveal page replaced it; it now has its own
 * component and an E2E assertion so it cannot quietly disappear again.
 *
 * Ink-on-paper tokens swap together in dark mode, so the contrast holds in both themes.
 */
export function VoicePromise({ className = "" }: { className?: string }) {
  return (
    <section aria-labelledby="voice-promise-heading" className={`rounded-md bg-ink p-4 text-paper ${className}`}>
      <div className="flex items-start gap-3">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
          <path d="M12 3 5 6v5c0 4.5 3 8.3 7 10 4-1.7 7-5.5 7-10V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <div className="flex flex-col gap-1.5">
          <h2 id="voice-promise-heading" className="text-base font-bold leading-snug">
            Your voice stays yours.
          </h2>
          <p className="text-sm font-bold leading-snug">No AI listens to, analyzes, or trains on your recordings. Ever.</p>
          <p className="text-sm font-bold leading-snug">Every recording is deleted after 30 days, on every plan. Your creatures and streaks stay forever.</p>
          <p className="text-sm leading-snug">
            Audio never leaves your device unless you keep a take.{" "}
            <Link href="/voice-data" className="font-bold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
              Read the full promise
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
