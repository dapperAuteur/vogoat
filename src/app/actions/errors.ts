"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/db/client";
import { logAppError } from "@/lib/errors/log";
import { isRateLimited } from "@/lib/rate-limit";

const input = z.object({
  digest: z.string().max(100).optional(),
  message: z.string().max(500),
  path: z.string().max(200),
});

/** Client error boundaries report what the user actually saw (digest links it to the cause). */
export async function reportClientErrorAction(args: { digest?: string; message: string; path: string }): Promise<void> {
  const parsed = input.safeParse(args);
  if (!parsed.success) return;
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`errlog:${ip}`, 10, 3_600_000)) return;
  const db = await getDb();
  await logAppError(db, { source: "client", ...parsed.data });
}
