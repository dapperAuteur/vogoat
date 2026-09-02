"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { err, type ActionResult } from "@/lib/action-result";
import { setMarketingConsent } from "@/lib/campaigns/core";
import { getSession } from "@/lib/session";

/** The player's own opt-in switch. Consent is never set by anything but this call. */
export async function setMarketingConsentAction(consent: boolean): Promise<ActionResult<{ consent: boolean }>> {
  const session = await getSession();
  if (!session) return err("unauthenticated", "Sign in first.");
  const db = await getDb();
  const result = await setMarketingConsent(db, session.user.id, consent);
  if (result.ok) revalidatePath("/guild");
  return result;
}
