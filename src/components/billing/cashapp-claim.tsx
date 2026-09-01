"use client";

import Image from "next/image";
import { useState } from "react";
import { submitCashAppClaimAction } from "@/app/actions/cashapp";

type Props = { status: "none" | "pending" | "verified" | "rejected"; price: string };

/** Pay the QR in Cash App, then claim with the display name you paid from. */
export function CashAppClaim({ status: initial, price }: Props) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "pending") {
    return (
      <p role="status" className="rounded-md border border-ochre px-3 py-2 text-sm text-ochre">
        Cash App payment claimed; BAM verifies it by hand (usually same day). This page updates
        once it clears.
      </p>
    );
  }
  if (status === "rejected") {
    return (
      <p role="alert" className="rounded-md border border-ochre px-3 py-2 text-sm text-ochre">
        Your last Cash App claim could not be matched to a payment. Check the name and try
        again, or reply to bam@awews.com.
      </p>
    );
  }

  return (
    <details className="rounded-md border border-rule bg-paper p-3">
      <summary className="min-h-11 cursor-pointer text-sm font-semibold">
        Prefer Cash App? Pay {price} by QR
      </summary>
      <div className="mt-3 flex flex-col gap-3">
        <Image src="/images/cashapp-qr.jpg" alt="Cash App QR code for paying VO GOAT's founder price" width={280} height={280} className="mx-auto h-auto w-56 rounded-md border border-rule" />
        <ol className="list-decimal pl-5 text-xs leading-relaxed text-muted">
          <li>Scan the code in Cash App and send exactly {price}.</li>
          <li>Enter the Cash App display name you paid from, so the payment can be matched.</li>
          <li>Founder access is switched on by hand after the payment shows up (usually same day).</li>
        </ol>
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setBusy(true);
            setError(null);
            const form = new FormData(event.currentTarget);
            void submitCashAppClaimAction(form).then((r) => {
              setBusy(false);
              if (r.ok) setStatus("pending");
              else setError(r.error);
            });
          }}
        >
          <label htmlFor="cashapp-name" className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
            Your Cash App display name
          </label>
          <input id="cashapp-name" name="cashAppName" required minLength={2} maxLength={60} placeholder="$yourcashtag or display name" className="min-h-11 rounded-md border border-rule bg-card px-3 text-sm" />
          <button type="submit" disabled={busy} className="min-h-11 rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50">
            {busy ? "Sending…" : "I paid; verify me"}
          </button>
          {error ? (
            <p role="alert" className="text-xs text-ochre">
              {error}
            </p>
          ) : null}
        </form>
      </div>
    </details>
  );
}
