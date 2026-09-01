import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { script } from "@/db/schema";
import { requireAdmin } from "@/lib/session";
import { submitVerdict } from "./actions";

export const metadata: Metadata = { title: "Script triage", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  candidate: "border-rule text-muted",
  use: "border-moss text-moss",
  backlog: "border-ochre text-ochre",
  never: "border-rule text-muted line-through",
};

/** The §8 weekly ritual, in-app. Role-gated; everyone else gets a 404. */
export default async function ScriptTriagePage() {
  await requireAdmin();
  const db = await getDb();
  const rows = await db.select().from(script).orderBy(asc(script.batch), asc(script.createdAt));
  const undecided = rows.filter((r) => r.status === "candidate").length;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Script triage</span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Admin
        </Link>
      </header>
      <p className="text-sm leading-relaxed text-muted">
        Mark each candidate. Only <span className="font-semibold text-ink">use</span> and{" "}
        <span className="font-semibold text-ink">backlog</span> scripts can be paired into dailies;{" "}
        <span className="font-semibold text-ink">never</span> is recorded so a line is not pitched
        again. {undecided} of {rows.length} still undecided.
      </p>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded-md border border-rule bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-display text-lg leading-snug">{row.body}</p>
              <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${STATUS_STYLE[row.status] ?? STATUS_STYLE.candidate}`}>
                {row.status}
              </span>
            </div>
            {row.notes ? <p className="mt-1 text-xs leading-relaxed text-muted">{row.notes}</p> : null}
            <div className="mt-3 flex items-center gap-2">
              {(["use", "backlog", "never"] as const).map((verdict) => (
                <form key={verdict} action={submitVerdict} className="flex-1">
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="verdict" value={verdict} />
                  <button
                    type="submit"
                    disabled={row.status === verdict}
                    className={`min-h-11 w-full rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-40 ${
                      verdict === "use" ? "border-moss bg-moss text-on-moss" : verdict === "backlog" ? "border-ochre text-ochre" : "border-rule text-muted"
                    }`}
                  >
                    {verdict}
                  </button>
                </form>
              ))}
            </div>
            {row.usedOn ? <p className="mt-2 text-xs text-muted">Paired into the daily of {row.usedOn}.</p> : null}
          </li>
        ))}
      </ul>
      <p className="pb-4 text-xs leading-relaxed text-muted">
        Batch 01 of the weekly 20-script ritual (PRD §8). Verdicts land in the database directly;
        the markdown batch file is history once this page is the routine.
      </p>
    </main>
  );
}
