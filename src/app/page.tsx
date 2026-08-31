import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSession } from "@/lib/session";

// Placeholder landing until the daily engine (build plan phase 3) replaces it with today's
// specimen. Kept on-brand so a preview deploy already reads as VoGoat.
export default async function HomePage() {
  const session = await getSession();
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">VoGoat</span>
        {session ? (
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-muted">{session.user.name}</span>
            <SignOutButton />
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Sign in
          </Link>
        )}
      </header>
      <p className="text-sm font-semibold text-muted">The daily voiceover game</p>
      <section className="rounded-md border border-rule bg-card p-5">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Specimen No. 1</p>
        <h1 className="mt-2 font-display text-3xl leading-tight italic">Arrives at launch.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          One shared voice recipe a day. Everyone gets the same absurd recipe, the same mundane
          script, and the same cartoon creature. Record your take, keep your best, collect the
          creature in your Menagerie, and share a spoiler-free card.
        </p>
      </section>
      <p className="text-xs leading-relaxed text-muted">
        Audio stays on your device until you keep a take. On free accounts, kept recordings are
        deleted after 30 days; your creatures and streaks stay. No voice-print analysis, no
        training data, ever.
      </p>
    </main>
  );
}
