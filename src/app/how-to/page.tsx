import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/how-to/guides";

export const metadata: Metadata = {
  title: "How to play",
  description:
    "Simple steps for everything you can do in VO GOAT: play the daily, sign in, manage your takes, share, read your Guild, browse the archive, practice, upgrade, and know what happens to your audio.",
  alternates: { canonical: "/how-to" },
};

/** The help index (BAM, 2026-09-02): one short guide per thing a player can do. */
export default function HowToIndexPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <Link href="/" className="font-display text-3xl tracking-wide italic">
          VO GOAT
        </Link>
        <Link
          href="/"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Today
        </Link>
      </header>

      <h1 className="font-display text-3xl leading-tight italic">How to play.</h1>

      <section className="rounded-md border border-ink bg-card p-4">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">The whole game in 30 seconds</p>
        <p className="mt-2 text-sm leading-relaxed">
          Every day, everyone on Earth gets the same absurd voice recipe, the same mundane line,
          and the same cartoon creature. Read the eight rows of the recipe, tap a row for its
          hint, then tap Record and say the line in that voice. Listen back and keep the take or
          throw it away; discarded audio never leaves your device. Submit the one you like and
          the creature joins your Guild, your run grows by a day, and you get a spoiler-free card
          to share. One entry a day, every plan. Tomorrow brings a new recipe at midnight UTC.
        </p>
      </section>

      <p className="px-1 text-sm leading-relaxed text-muted">
        Each guide below is a short numbered walkthrough with room for a video.
      </p>

      <ul className="flex flex-col gap-2">
        {GUIDES.map((guide, index) => (
          <li key={guide.slug}>
            <Link
              href={`/how-to/${guide.slug}`}
              className="flex min-h-11 items-start gap-3 rounded-md border border-rule bg-card p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              <span className="font-display text-2xl text-muted tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <span className="min-w-0">
                <span className="block font-display text-lg leading-snug italic">{guide.title}</span>
                <span className="block text-xs leading-relaxed text-muted">{guide.blurb}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="pb-4 text-xs leading-relaxed text-muted">
        Still stuck? The{" "}
        <Link href="/about" className="font-semibold text-moss underline-offset-4 hover:underline">
          story behind the wheels
        </Link>{" "}
        explains where the voices come from, and{" "}
        <a href="mailto:bam@awews.com" className="font-semibold text-moss underline-offset-4 hover:underline">
          a human reads the mail
        </a>
        .
      </p>
    </main>
  );
}
