import { eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { script, type ScriptStatus } from "@/db/schema";

export const VERDICTS = ["use", "backlog", "never"] as const;
export type Verdict = (typeof VERDICTS)[number];

/**
 * The §8 ritual, in-app: BAM marks each candidate use / backlog / never. Verdicts are
 * re-editable (a daily already served keeps its script regardless); decidedAt records the
 * latest call.
 */
export async function setScriptVerdict(db: Db, id: string, verdict: Verdict): Promise<ScriptStatus | null> {
  const rows = await db
    .update(script)
    .set({ status: verdict, decidedAt: new Date() })
    .where(eq(script.id, id))
    .returning({ status: script.status });
  return rows[0]?.status ?? null;
}
