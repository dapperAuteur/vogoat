import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About the method",
  description: "Where the eight wheels come from: Rudolf Laban's efforts, popularized for voice work by Darren McStay.",
};

/** PRD §14: credit the method's lineage. The scripts and materials here are original. */
export default function AboutPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl tracking-wide italic">VO GOAT</span>
        <Link href="/" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Today
        </Link>
      </header>
      <h1 className="font-display text-3xl leading-tight italic">Where the wheels come from.</h1>
      <section className="rounded-md border border-rule bg-card p-4 text-sm leading-relaxed">
        <p>
          The effort wheel (dab, flick, press, punch, wring, slash, glide, float) is{" "}
          <span className="font-semibold">Rudolf Laban&apos;s</span> movement taxonomy, a century-old
          staple of actor training: every action described by its weight, space, and time. Say a
          boring sentence as a &ldquo;float&rdquo; and your voice goes light, indirect, sustained;
          say it as a &ldquo;punch&rdquo; and every word lands.
        </p>
        <p className="mt-3">
          Applying Laban&apos;s efforts to voice work the way this game does was popularized by
          voice coach <span className="font-semibold">Darren McStay</span> (Improve Your Voice), whose
          video on building distinctly different voices inspired VO GOAT&apos;s parameter system.
          His teaching is worth your time:{" "}
          <a
            href="https://www.youtube.com/results?search_query=Improve+Your+Voice+Darren+McStay"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-moss underline-offset-4 hover:underline"
          >
            find his channel on YouTube
            <span className="sr-only"> (opens in new tab)</span>
          </a>
          .
        </p>
        <p className="mt-3 text-muted">
          The method is shared craft; the presentation is his. VO GOAT&apos;s scripts, creatures,
          and materials are original, and none of his script lines appear here.
        </p>
      </section>
      <section className="rounded-md border border-rule bg-card p-4 text-sm leading-relaxed">
        <p className="font-semibold">Why 11,664 recipes?</p>
        <p className="mt-1 text-muted">
          Eight efforts × three placements × two airs × three ages × three sizes × three tempos ×
          three volumes × three attitudes. One a day is 31 years of dailies, every one absurd in
          its own way.
        </p>
      </section>
      <p className="pb-4 text-xs leading-relaxed text-muted">
        Curious what happens to recordings? Read{" "}
        <Link href="/voice-data" className="font-semibold text-moss underline-offset-4 hover:underline">
          the voice-data promise
        </Link>
        .
      </p>
    </main>
  );
}
