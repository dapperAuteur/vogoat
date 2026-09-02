import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/db/client";
import { BODY_MAX, SUBJECT_MAX, countEligibleRecipients, listCampaigns } from "@/lib/campaigns/core";
import { hasMailgun, isProduction } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import { createCampaignDraft, sendCampaignNow, updateCampaignDraft } from "./actions";

export const metadata: Metadata = { title: "Campaigns", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  draft: "border-rule text-muted",
  sending: "border-ochre text-ochre",
  sent: "border-moss text-moss",
};

const PROBLEM_COPY: Record<string, string> = {
  bad_input: "A campaign needs a subject and a body before it can be saved.",
  no_recipients: "Nobody has opted in yet, so there is no one to send to. The draft is untouched.",
  already_sent: "That campaign has already been sent. Write a new one instead.",
  wrong_state: "That campaign is not a draft any more, so it cannot be edited.",
  not_found: "That campaign was not found.",
};

const inputClass =
  "min-h-11 w-full rounded-md border border-rule bg-paper px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";
const labelClass = "text-[10px] font-semibold tracking-[0.16em] text-muted uppercase";

type Search = { searchParams: Promise<{ confirm?: string; done?: string; problem?: string; n?: string; failed?: string }> };

/** Announcement email to players who opted in (plans/future/03). Role-gated; others get a 404. */
export default async function AdminCampaignsPage({ searchParams }: Search) {
  await requireAdmin();
  const { confirm, done, problem, n, failed } = await searchParams;
  const db = await getDb();
  const [rows, eligible] = await Promise.all([listCampaigns(db), countEligibleRecipients(db)]);

  return (
    <main id="main" className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-5 py-6">
      <header className="flex items-baseline justify-between">
        <span className="font-display text-3xl italic">Campaigns</span>
        <Link
          href="/admin"
          className="flex min-h-11 items-center px-2 text-sm font-semibold text-moss underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Admin
        </Link>
      </header>

      <p className="text-sm leading-relaxed text-muted">
        Announcement email to players who ticked the box on their Guild page.{" "}
        <span className="font-semibold text-ink">
          {eligible} {eligible === 1 ? "player has" : "players have"} opted in.
        </span>{" "}
        Every message carries that person&apos;s own unsubscribe link, and one click takes them
        off the list. Sending twice is refused, so a reload cannot double up.
      </p>

      <p className="rounded-md border border-rule bg-card px-3 py-2 text-xs leading-relaxed text-muted">
        {isProduction
          ? hasMailgun
            ? "Mailgun is configured. Send means send."
            : "Mailgun is not configured, so nothing will leave the server. Set the Mailgun keys first."
          : "This is development: nothing is emailed. Each message is written to the server console instead."}
      </p>

      {done === "sent" ? (
        <p role="status" className="rounded-md border border-moss px-3 py-2 text-sm text-moss">
          Sent to {n ?? "0"} {n === "1" ? "player" : "players"}.
          {failed && failed !== "0" ? ` ${failed} could not be delivered and were skipped.` : ""}
        </p>
      ) : null}
      {done === "drafted" ? (
        <p role="status" className="rounded-md border border-moss px-3 py-2 text-sm text-moss">
          Draft saved. Read it once more, then send.
        </p>
      ) : null}
      {done === "saved" ? (
        <p role="status" className="rounded-md border border-moss px-3 py-2 text-sm text-moss">
          Draft updated.
        </p>
      ) : null}
      {problem ? (
        <p role="alert" className="rounded-md border border-ochre px-3 py-2 text-sm text-ochre">
          {PROBLEM_COPY[problem] ?? "That did not work. Try again."}
        </p>
      ) : null}

      <form action={createCampaignDraft} className="flex flex-col gap-2 rounded-md border border-ink bg-card p-4">
        <h2 className="font-display text-lg">New draft</h2>
        <label htmlFor="subject" className={labelClass}>
          Subject
        </label>
        <input id="subject" name="subject" required minLength={3} maxLength={SUBJECT_MAX} className={inputClass} placeholder="Day 100 and a new wheel" />
        <label htmlFor="body" className={labelClass}>
          Body
        </label>
        <textarea id="body" name="body" required minLength={10} maxLength={BODY_MAX} rows={7} className="w-full rounded-md border border-rule bg-paper p-3 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" placeholder="Plain text. The unsubscribe line is added for you." />
        <button
          type="submit"
          className="min-h-11 rounded-md border border-ink bg-moss text-sm font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Save draft
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-md border border-rule bg-card p-4 text-sm leading-relaxed text-muted">
          No campaigns yet. The first draft you save shows up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const confirming = confirm === row.id;
            return (
              <li key={row.id} className="rounded-md border border-rule bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg leading-snug">{row.subject}</p>
                  <span className={`shrink-0 rounded-sm border px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase ${STATUS_STYLE[row.status] ?? STATUS_STYLE.draft}`}>
                    {row.status}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-muted">{row.body}</p>
                {row.status === "sent" ? (
                  <p className="mt-2 text-xs text-muted">
                    Sent to {row.recipientCount} {row.recipientCount === 1 ? "player" : "players"}
                    {row.sentAt ? ` on ${row.sentAt.toISOString().slice(0, 10)}` : ""}.
                  </p>
                ) : null}

                {row.status === "draft" && !confirming ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <Link
                      href={`/admin/campaigns?confirm=${row.id}`}
                      className="flex min-h-11 items-center justify-center rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                    >
                      Send to {eligible} {eligible === 1 ? "player" : "players"}
                    </Link>
                    <details className="rounded-md border border-rule p-3">
                      <summary className="min-h-11 cursor-pointer text-sm font-semibold">Edit this draft</summary>
                      <form action={updateCampaignDraft} className="mt-3 flex flex-col gap-2">
                        <input type="hidden" name="id" value={row.id} />
                        <label htmlFor={`subject-${row.id}`} className={labelClass}>
                          Subject
                        </label>
                        <input id={`subject-${row.id}`} name="subject" required minLength={3} maxLength={SUBJECT_MAX} defaultValue={row.subject} className={inputClass} />
                        <label htmlFor={`body-${row.id}`} className={labelClass}>
                          Body
                        </label>
                        <textarea id={`body-${row.id}`} name="body" required minLength={10} maxLength={BODY_MAX} rows={6} defaultValue={row.body} className="w-full rounded-md border border-rule bg-paper p-3 text-sm leading-relaxed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current" />
                        <button
                          type="submit"
                          className="min-h-11 rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                        >
                          Save changes
                        </button>
                      </form>
                    </details>
                  </div>
                ) : null}

                {row.status === "draft" && confirming ? (
                  <div className="mt-3 rounded-md border border-ochre p-3">
                    <p className="text-sm leading-relaxed text-ochre">
                      This goes to {eligible} {eligible === 1 ? "player" : "players"} right now and
                      cannot be recalled. Send it?
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <form action={sendCampaignNow} className="flex-1">
                        <input type="hidden" name="id" value={row.id} />
                        <button
                          type="submit"
                          disabled={eligible === 0}
                          className="min-h-11 w-full rounded-md border border-ink bg-moss text-sm font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-40"
                        >
                          Yes, send it
                        </button>
                      </form>
                      <Link
                        href="/admin/campaigns"
                        className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-rule text-sm font-semibold text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                      >
                        Not yet
                      </Link>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <p className="pb-4 text-xs leading-relaxed text-muted">
        Consent is opt-in only and starts off for every account. A campaign never grants a daily
        entry: promos discount money, they never buy a second submission.
      </p>
    </main>
  );
}
