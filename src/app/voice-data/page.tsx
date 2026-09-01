import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Your voice data",
  description: "What VO GOAT does and never does with your recordings, in plain language.",
};

/** PRD §11: say the voice-data policy loudly, in plain language. */
export default function VoiceDataPage() {
  const promises: Array<[string, string]> = [
    ["Audio stays on your device until you keep a take.", "Recording happens in your browser. Discarded takes are deleted from your device and are never uploaded; only the count of attempts is stored (that is how the free plan's 3 takes a day works)."],
    ["No voice-print analysis. No biometric identification.", "Nothing listens to your audio to figure out who you are, how you feel, or anything else. The creature comes from the recipe, never from analyzing your voice."],
    ["Your audio is never AI training data.", "Not ours, not anyone's. Ever."],
    ["Deletion deletes.", "Deleting a take removes the audio file itself, not just the row that points at it. Revoking a share link kills that link for good."],
    ["Free-plan audio expires at 30 days, and expiry deletes the file too.", "Your creatures, streaks, and share cards are yours forever; only the audio goes. Paid plans keep audio until you delete it."],
    ["Sharing is a link you hand out, never a feed.", "Shared pages are unguessable, unlisted, revocable, and carry a report button."],
  ];
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
        <Link href="/" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Today
        </Link>
      </header>
      <h1 className="font-display text-3xl leading-tight italic">Your voice, your data.</h1>
      <p className="text-sm leading-relaxed text-muted">
        A voice game lives or dies on trust, so here is the whole policy in plain language.
      </p>
      <ul className="flex flex-col gap-3">
        {promises.map(([claim, detail]) => (
          <li key={claim} className="rounded-md border border-rule bg-card p-4">
            <p className="font-semibold">{claim}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p>
          </li>
        ))}
      </ul>
      <p className="pb-4 text-xs leading-relaxed text-muted">
        Questions or a report to make? Every shared page has a report button, and{" "}
        <a href="mailto:bam@awews.com" className="font-semibold text-moss underline-offset-4 hover:underline">
          a human reads the mail
        </a>
        .
      </p>
    </main>
  );
}
