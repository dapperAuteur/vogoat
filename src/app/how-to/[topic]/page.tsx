import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VideoSlot } from "@/components/how-to/video-slot";
import { GUIDES, guideBySlug } from "@/lib/how-to/guides";

type Params = { params: Promise<{ topic: string }> };

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ topic: guide.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { topic } = await params;
  const guide = guideBySlug(topic);
  if (!guide) return { title: "Not found", robots: { index: false } };
  return {
    title: `How to ${guide.title.charAt(0).toLowerCase()}${guide.title.slice(1)}`,
    description: guide.blurb,
    alternates: { canonical: `/how-to/${guide.slug}` },
  };
}

/** One capability, numbered steps, and a slot for its walkthrough video. */
export default async function HowToGuidePage({ params }: Params) {
  const { topic } = await params;
  const guide = guideBySlug(topic);
  if (!guide) notFound();

  const index = GUIDES.findIndex((g) => g.slug === guide.slug);
  const next = GUIDES[(index + 1) % GUIDES.length];

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <Link href="/" className="font-display text-3xl tracking-wide italic">
          VO GOAT
        </Link>
        <Link
          href="/how-to"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          All guides
        </Link>
      </header>

      <div>
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
          Guide {index + 1} of {GUIDES.length}
        </p>
        <h1 className="mt-1 font-display text-3xl leading-tight italic">{guide.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">{guide.blurb}</p>
      </div>

      <VideoSlot videoId={guide.videoId} title={guide.title} />

      <section className="rounded-md border border-rule bg-card p-4">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">The steps</p>
        <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed marker:font-semibold marker:text-muted">
          {guide.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {guide.note ? (
          <p className="mt-3 border-t border-dotted border-rule pt-3 text-xs leading-relaxed text-muted">{guide.note}</p>
        ) : null}
      </section>

      <div className="flex flex-col gap-2">
        <Link
          href="/"
          className="flex min-h-12 items-center justify-center rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Go to today&apos;s specimen
        </Link>
        <Link
          href={`/how-to/${next.slug}`}
          className="flex min-h-11 items-center justify-center rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Next guide: {next.title}
        </Link>
      </div>

      <p className="pb-4 text-xs leading-relaxed text-muted">
        Every guide lives on the{" "}
        <Link href="/how-to" className="font-semibold text-moss underline-offset-4 hover:underline">
          how to play page
        </Link>
        .
      </p>
    </main>
  );
}
