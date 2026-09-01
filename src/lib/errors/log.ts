import { desc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { errorLog } from "@/db/schema";

/** Best-effort, never-throwing error capture; the console always gets a copy. */
export async function logAppError(
  db: Db,
  args: { source: "server" | "client"; message: string; digest?: string | null; path?: string | null },
): Promise<void> {
  const message = args.message.slice(0, 500) || "unknown error";
  try {
    await db.insert(errorLog).values({
      source: args.source,
      message,
      digest: args.digest?.slice(0, 100) ?? null,
      path: args.path?.slice(0, 200) ?? null,
    });
  } catch (error: unknown) {
    console.error("[errors] could not persist:", error instanceof Error ? error.constructor.name : "unknown");
  }
}

export async function recentErrors(db: Db, limit = 50) {
  return db.select().from(errorLog).orderBy(desc(errorLog.createdAt)).limit(limit);
}
