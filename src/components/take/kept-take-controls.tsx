"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { discardTakeAction, submitTakeAction } from "@/app/actions/takes";

/** Submit or discard one kept take; the server re-render carries the new state. */
export function KeptTakeControls({ takeId, canSubmit }: { takeId: string; canSubmit: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "submit" | "discard">(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "submit" | "discard") {
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
          {busy === "discard" ? "Removing…" : "Delete"}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-ochre">
          {error}
        </p>
      ) : null}
    </div>
  );
}
