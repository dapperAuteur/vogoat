"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { err, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/session";
import { createShare, reportShare, revokeShare, type ShareInfo } from "@/lib/share/core";

const uuid = z.uuid();

export async function createShareAction(takeId: string): Promise<ActionResult<ShareInfo>> {
  const session = await getSession();
  if (!session) return err("unauthenticated", "Sign in first.");
  if (!uuid.safeParse(takeId).success) return err("bad_input", "Invalid take.");
  const db = await getDb();
  const result = await createShare(db, { userId: session.user.id, takeId });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function revokeShareAction(takeId: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return err("unauthenticated", "Sign in first.");
  if (!uuid.safeParse(takeId).success) return err("bad_input", "Invalid take.");
  const db = await getDb();
  const result = await revokeShare(db, { userId: session.user.id, takeId });
  if (result.ok) revalidatePath("/");
  return result;
}

const reportInput = z.object({
  slug: z.string().min(8).max(64),
  reason: z.string(),
  detail: z.string().max(2000).optional(),
});

/** Anonymous on purpose: anyone a link reaches can report. Turnstile lands in the launch pass. */
export async function reportShareAction(formData: FormData): Promise<ActionResult<null>> {
  const parsed = reportInput.safeParse({
    slug: formData.get("slug"),
    reason: formData.get("reason"),
    detail: formData.get("detail") || undefined,
  });
  if (!parsed.success) return err("bad_input", "Pick a reason.");
  const db = await getDb();
  return reportShare(db, { slug: parsed.data.slug, reason: parsed.data.reason, detail: parsed.data.detail ?? null });
}
