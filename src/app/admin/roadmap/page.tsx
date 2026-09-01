import { readFile } from "node:fs/promises";
import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Roadmap", robots: { index: false } };
export const dynamic = "force-dynamic";

type Row = { phase: string; name: string; status: string };

/** Renders the repo's ROADMAP.md (single source of truth) for the admin. */
export default async function AdminRoadmapPage() {
  await requireAdmin();
  let rows: Row[] = [];
  let tail = "";
  try {
    const md = await readFile(process.cwd() + "/ROADMAP.md", "utf8");
    rows = [...md.matchAll(/^\| (\d+) \| (.+?) \| (.+?) \|$/gm)].map((m) => ({ phase: m[1], name: m[2], status: m[3] }));
    tail = md.split("Backlog")[1]?.trim() ?? "";
  } catch {
    rows = [];
  }
  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Roadmap</span>
        <Link href="/admin" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Admin
        </Link>
      </header>
      {rows.length === 0 ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm text-muted">
          ROADMAP.md was not found in this deployment.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => {
            const done = /^Done|^Mostly done/.test(row.status);
            const started = /In progress|shipped|Code done/.test(row.status);
            return (
              <li key={row.phase} className="rounded-md border border-rule bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {row.phase}. {row.name}
                  </p>
                  <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${done ? "border-moss text-moss" : started ? "border-ochre text-ochre" : "border-rule text-muted"}`}>
                    {done ? "done" : started ? "partial" : "todo"}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{row.status}</p>
              </li>
            );
          })}
        </ul>
      )}
      {tail ? (
        <div className="rounded-md border border-rule bg-card p-3">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Backlog</p>
          <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-muted">{tail}</p>
        </div>
      ) : null}
      <p className="pb-4 text-xs text-muted">Source of truth: ROADMAP.md in the repo; this page just renders it.</p>
    </main>
  );
}
