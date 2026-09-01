"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { approveDaily, extendQueue, rerollCreature, rerollRecipe, revertDailyToDraft, swapScript } from "@/lib/authoring/core";
import { dayKey } from "@/lib/game/day";
import { env } from "@/lib/env";
import { requireAdmin } from "@/lib/session";

const uuid = z.uuid();

function refresh() {
  revalidatePath("/admin/dailies");
}

export async function extendQueueAction(): Promise<void> {
  await requireAdmin();
  const db = await getDb();
  await extendQueue(db, { today: dayKey(new Date(), env.DAILY_TIMEZONE), days: 14 });
  refresh();
}

async function withDaily(formData: FormData, fn: (db: Awaited<ReturnType<typeof getDb>>, id: string) => Promise<unknown>): Promise<void> {
  await requireAdmin();
  const id = formData.get("dailyId");
  if (typeof id !== "string" || !uuid.safeParse(id).success) return;
  const db = await getDb();
  await fn(db, id);
  refresh();
}

export async function approveDailyAction(formData: FormData): Promise<void> {
  await withDaily(formData, (db, id) => approveDaily(db, id));
}

export async function revertDailyAction(formData: FormData): Promise<void> {
  await withDaily(formData, (db, id) => revertDailyToDraft(db, id));
}

export async function rerollCreatureAction(formData: FormData): Promise<void> {
  await withDaily(formData, (db, id) => rerollCreature(db, id));
}

export async function rerollRecipeAction(formData: FormData): Promise<void> {
  await withDaily(formData, (db, id) => rerollRecipe(db, id));
}

export async function swapScriptAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const dailyId = formData.get("dailyId");
  const scriptId = formData.get("scriptId");
  if (typeof dailyId !== "string" || typeof scriptId !== "string") return;
  if (!uuid.safeParse(dailyId).success || !uuid.safeParse(scriptId).success) return;
  const db = await getDb();
  await swapScript(db, dailyId, scriptId);
  refresh();
}
