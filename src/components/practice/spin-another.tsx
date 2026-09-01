"use client";

import { useRouter } from "next/navigation";
import { RECIPE_COUNT } from "@/lib/game/recipe";

/** Client-side randomness (event handler, so purity rules are happy). */
export function SpinAnother() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.push(`/practice?r=${1 + Math.floor(Math.random() * RECIPE_COUNT)}`)}
      className="flex min-h-12 flex-1 items-center justify-center rounded-md border border-ink font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
    >
      Spin another recipe
    </button>
  );
}
