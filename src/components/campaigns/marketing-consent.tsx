"use client";

import { useId, useState } from "react";
import { setMarketingConsentAction } from "@/app/actions/campaigns";

type Props = { initial: boolean };

/** Opt-in email, saved the moment the box changes. Off by default, off again in one click. */
export function MarketingConsent({ initial }: Props) {
  const id = useId();
  const [consent, setConsent] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="rounded-md border border-rule bg-card p-4">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(event) => {
            const next = event.currentTarget.checked;
            setConsent(next);
            setBusy(true);
            setError(null);
            void setMarketingConsentAction(next).then((result) => {
              setBusy(false);
              if (!result.ok) {
                setConsent(!next);
                setError(result.error);
              }
            });
          }}
          className="mt-0.5 size-5 shrink-0 accent-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        />
        <label htmlFor={id} className="min-h-11 text-sm leading-relaxed font-semibold">
          Email me when something new lands
        </label>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted" role="status">
        {busy ? "Saving your choice…" : consent ? "Saved. You will get the occasional announcement." : "Off. No announcement email is sent."}{" "}
        You can undo this any time, here or from the link at the bottom of any email.
      </p>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-ochre">
          {error}
        </p>
      ) : null}
    </section>
  );
}
