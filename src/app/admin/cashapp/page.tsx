import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { listClaims } from "@/lib/billing/cashapp";
import { requireAdmin } from "@/lib/session";
import { resolveCashAppClaimAction } from "@/app/actions/cashapp";

export const metadata: Metadata = { title: "Cash App claims", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Verify against the Cash App activity feed; verifying grants lifetime (founder counted). */
export default async function CashAppClaimsPage() {
  await requireAdmin();
  const db = await getDb();
  const claims = await listClaims(db);
  const pending = claims.filter((c) => c.claim.status === "pending").length;

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Cash App claims</span>
        <Link href="/admin" className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
          Admin
        </Link>
      </header>
      <p className="text-sm text-muted">
        {pending} pending. Verify only after the ${"100.00"} payment shows in your Cash App
        activity from that name; verifying grants lifetime and counts the founder seat.
      </p>
      {claims.length === 0 ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm text-muted">No claims yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {claims.map(({ claim, userName, userEmail }) => (
            <li key={claim.id} className="rounded-md border border-rule bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{claim.cashAppName}</p>
                  <p className="text-xs text-muted">
                    {userName} · {userEmail}
                  </p>
                  <p className="text-xs text-muted">{claim.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC</p>
                </div>
                <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${claim.status === "pending" ? "border-ochre text-ochre" : claim.status === "verified" ? "border-moss text-moss" : "border-rule text-muted"}`}>
                  {claim.status}
                </span>
              </div>
              {claim.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <form action={resolveCashAppClaimAction} className="flex-1">
                    <input type="hidden" name="claimId" value={claim.id} />
                    <input type="hidden" name="action" value="verified" />
                    <button type="submit" className="min-h-11 w-full rounded-md bg-moss text-sm font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                      verify + grant lifetime
                    </button>
                  </form>
                  <form action={resolveCashAppClaimAction} className="flex-1">
                    <input type="hidden" name="claimId" value={claim.id} />
                    <input type="hidden" name="action" value="rejected" />
                    <button type="submit" className="min-h-11 w-full rounded-md border border-rule text-sm font-semibold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current">
                      reject
                    </button>
                  </form>
                </div>
              ) : claim.adminNotes ? (
                <p className="mt-2 text-xs text-muted">{claim.adminNotes}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
