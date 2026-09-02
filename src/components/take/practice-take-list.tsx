"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deletePracticeTakeAction } from "@/app/actions/practice";

type Item = { id: string; recipeId: number; creatureName: string; durationMs: number | null };

/** Saved practice takes: play, download, delete. Never part of the daily. */
export function PracticeTakeList({ items }: { items: Item[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-2" aria-label="Saved practice takes">
      <p className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">Saved practice takes</p>
      {items.map((item) => (
        <div key={item.id} className="flex flex-col gap-2 rounded-md border border-rule bg-card p-3">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-base italic">{item.creatureName}</span>
            <span className="text-xs text-muted">{item.durationMs ? `${(item.durationMs / 1000).toFixed(1)}s` : ""}</span>
          </div>
          <audio controls preload="none" src={`/api/practice-takes/${item.id}/audio`} className="w-full" />
          <div className="flex gap-2">
            <a
              href={`/api/practice-takes/${item.id}/audio?download=1`}
              className="flex min-h-11 flex-1 items-center justify-center rounded-md border border-rule text-sm font-semibold text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              Download
            </a>
            <button
              type="button"
              disabled={busy === item.id}
              onClick={() => {
                setBusy(item.id);
                void deletePracticeTakeAction(item.id).finally(() => {
                  setBusy(null);
                  router.refresh();
                });
              }}
              className="min-h-11 flex-1 rounded-md border border-ink text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
            >
              {busy === item.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
