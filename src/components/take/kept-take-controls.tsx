"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { discardTakeAction, submitTakeAction } from "@/app/actions/takes";

/** Submit or discard one kept take; the server re-render carries the new state. */
export function KeptTakeControls({
  takeId,
  canSubmit,
  isLastOption,
}: {
  takeId: string;
  canSubmit: boolean;
  /** True when this is the only kept take and no attempts remain: deleting locks the day. */
  isLastOption: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "submit" | "discard">(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "submit" | "discard") {
    if (kind === "discard" && isLastOption && !confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(kind);
    setError(null);
    const result = kind === "submit" ? await submitTakeAction(takeId) : await discardTakeAction(takeId);
    if (!result.ok) setError(result.error);
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        {canSubmit ? (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run("submit")}
            className="min-h-11 flex-1 rounded-md bg-moss px-3 text-sm font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
          >
            {busy === "submit" ? "Submitting…" : "Submit as today's entry"}
          </button>
        ) : null}
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run("discard")}
          className="min-h-11 flex-1 rounded-md border border-ink px-3 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
        >
          {busy === "discard" ? "Removing…" : confirmDelete ? "Delete anyway" : "Delete"}
        </button>
      </div>
      {confirmDelete && busy === null ? (
        <p role="alert" className="text-xs leading-relaxed text-ochre">
          This is your only kept take and no attempts remain today; deleting it leaves nothing to
          submit until tomorrow.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-ochre">
          {error}
        </p>
      ) : null}
    </div>
  );
}
