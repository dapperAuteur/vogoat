"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { dayKey } from "@/lib/game/day";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/session";
import { saveWorkshopEntry } from "@/lib/workshop/core";

const input = z.object({ deviceId: z.uuid(), body: z.string().min(1).max(20_000) });

export async function saveWorkshopEntryAction(formData: FormData): Promise<void> {
  const user = await requireAdmin();
  const parsed = input.safeParse({ deviceId: formData.get("deviceId"), body: formData.get("body") });
  if (!parsed.success) return;
  const db = await getDb();
  await saveWorkshopEntry(db, {
    userId: user.id,
    dayKey: dayKey(new Date(), env.DAILY_TIMEZONE),
    deviceId: parsed.data.deviceId,
    body: parsed.data.body,
    isScriptCandidate: formData.get("scriptCandidate") === "on",
  });
  revalidatePath("/admin/workshop");
}
