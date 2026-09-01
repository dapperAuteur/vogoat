"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { err, type ActionResult } from "@/lib/action-result";
import { resolveClaim, submitCashAppClaim } from "@/lib/billing/cashapp";
import { isRateLimited } from "@/lib/rate-limit";
import { getSession, requireAdmin } from "@/lib/session";

export async function submitCashAppClaimAction(formData: FormData): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return err("unauthenticated", "Sign in first.");
  const name = formData.get("cashAppName");
  if (typeof name !== "string") return err("bad_input", "Enter your Cash App name.");
  if (isRateLimited(`cashapp:${session.user.id}`, 3, 3_600_000)) return err("rate_limited", "Slow down a moment.");
  const db = await getDb();
  const result = await submitCashAppClaim(db, { userId: session.user.id, cashAppName: name });
  if (result.ok) revalidatePath("/upgrade");
  return result;
}

const resolveInput = z.object({ claimId: z.uuid(), action: z.enum(["verified", "rejected"]), notes: z.string().max(500).optional() });

export async function resolveCashAppClaimAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = resolveInput.safeParse({
    claimId: formData.get("claimId"),
    action: formData.get("action"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;
  const db = await getDb();
  await resolveClaim(db, parsed.data);
  revalidatePath("/admin/cashapp");
}
