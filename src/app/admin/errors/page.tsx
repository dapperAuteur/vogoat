import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { recentErrors } from "@/lib/errors/log";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Errors", robots: { index: false } };
export const dynamic = "force-dynamic";

/** How and why things failed: server captures via instrumentation, client via the boundaries. */
export default async function AdminErrorsPage() {
  await requireAdmin();
  const db = await getDb();
  const rows = await recentErrors(db, 50);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Errors</span>
        <Link href="/admin" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Admin
        </Link>
      </header>
      <p className="text-sm text-muted">
        Last {rows.length} events, newest first. A user&apos;s error screen shows the same
        reference (digest) as the matching server row.
      </p>
      {rows.length === 0 ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm text-muted">Nothing has failed. Good.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border border-rule bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold break-words">{row.message}</p>
                <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${row.source === "server" ? "border-ochre text-ochre" : "border-rule text-muted"}`}>
                  {row.source}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {row.path ?? "unknown path"} · {row.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                {row.digest ? ` · ref ${row.digest}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
