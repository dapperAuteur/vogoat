"use client";

import { useState } from "react";
import { reportShareAction } from "@/app/actions/share";
import { REPORT_REASONS } from "@/lib/share/core";

/** On every shared page (PRD §11). BAM triages reports in the admin console. */
export function ReportForm({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (status === "sent") {
    return (
      <p role="status" className="text-xs text-muted">
        Reported. Thank you; a human reviews every report.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 self-start px-1 text-xs font-semibold text-muted underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        Report this page
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-md border border-rule bg-card p-3"
      onSubmit={(event) => {
        event.preventDefault();
        setStatus("sending");
        const form = new FormData(event.currentTarget);
        form.set("slug", slug);
        void reportShareAction(form).then((r) => setStatus(r.ok ? "sent" : "error"));
      }}
    >
      <label htmlFor="report-reason" className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        Why are you reporting this?
      </label>
      <select
        id="report-reason"
        name="reason"
        required
        className="min-h-11 rounded-md border border-rule bg-paper px-2 text-sm"
        defaultValue=""
      >
        <option value="" disabled>
          Pick a reason
        </option>
        {REPORT_REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <label htmlFor="report-detail" className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
        Anything else (optional)
      </label>
      <textarea id="report-detail" name="detail" rows={2} maxLength={2000} className="rounded-md border border-rule bg-paper p-2 text-sm" />
      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-11 rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
      >
        {status === "sending" ? "Sending…" : "Send report"}
      </button>
      {status === "error" ? (
        <p role="alert" className="text-xs text-ochre">
          That did not go through; try again.
        </p>
      ) : null}
    </form>
  );
}
