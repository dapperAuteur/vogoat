"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { err, type ActionResult } from "@/lib/action-result";
import { getTakeAudioStore } from "@/lib/blob-store";
import { dayKey } from "@/lib/game/day";
import { env } from "@/lib/env";
import { isRateLimited } from "@/lib/rate-limit";
import { getSession, type SessionUser } from "@/lib/session";
import { discardTake, keepTake, registerTake, submitTake, type TakeView } from "@/lib/takes/core";

async function currentUser(): Promise<SessionUser | null> {
  const session = await getSession();
  return session ? (session.user as SessionUser) : null;
}

const uuid = z.uuid();

export async function registerTakeAction(dailyId: string): Promise<ActionResult<{ takeId: string; takeNumber: number; limit: number | null }>> {
  const user = await currentUser();
  if (!user) return err("unauthenticated", "Sign in to record counted takes.");
  if (!uuid.safeParse(dailyId).success) return err("bad_input", "Invalid daily.");
  if (isRateLimited(`register:${user.id}`, 10, 60_000)) return err("rate_limited", "Slow down a moment.");
  const db = await getDb();
  return registerTake(db, { userId: user.id, plan: user.plan as "free", dailyId, role: user.role });
}

export async function keepTakeAction(formData: FormData): Promise<ActionResult<TakeView>> {
  const user = await currentUser();
  if (!user) return err("unauthenticated", "Sign in to keep takes.");
  const takeId = formData.get("takeId");
  const durationMs = Number(formData.get("durationMs"));
  const audio = formData.get("audio");
  if (typeof takeId !== "string" || !uuid.safeParse(takeId).success || !(audio instanceof File) || !Number.isFinite(durationMs)) {
    return err("bad_input", "Invalid keep request.");
  }
  if (isRateLimited(`keep:${user.id}`, 10, 60_000)) return err("rate_limited", "Slow down a moment.");
  const db = await getDb();
  const result = await keepTake(db, getTakeAudioStore(), {
    userId: user.id,
    plan: user.plan as "free",
    takeId,
    bytes: new Uint8Array(await audio.arrayBuffer()),
    mime: audio.type || "audio/webm",
    durationMs,
  });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function discardTakeAction(takeId: string): Promise<ActionResult<TakeView>> {
  const user = await currentUser();
  if (!user) return err("unauthenticated", "Sign in first.");
  if (!uuid.safeParse(takeId).success) return err("bad_input", "Invalid take.");
  const db = await getDb();
  const result = await discardTake(db, getTakeAudioStore(), { userId: user.id, takeId });
  if (result.ok) revalidatePath("/");
  return result;
}

export async function submitTakeAction(takeId: string): Promise<ActionResult<TakeView>> {
  const user = await currentUser();
  if (!user) return err("unauthenticated", "Sign in to submit.");
  if (!uuid.safeParse(takeId).success) return err("bad_input", "Invalid take.");
  if (isRateLimited(`submit:${user.id}`, 5, 60_000)) return err("rate_limited", "Slow down a moment.");
  const db = await getDb();
  const result = await submitTake(db, { userId: user.id, takeId, todayKey: dayKey(new Date(), env.DAILY_TIMEZONE), allowResubmit: user.role === "admin" });
  if (result.ok) revalidatePath("/");
  return result;
}
