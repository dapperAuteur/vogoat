"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { err, type ActionResult } from "@/lib/action-result";
import { getTakeAudioStore } from "@/lib/blob-store";
import { deletePracticeTake, savePracticeTake } from "@/lib/practice/core";
import { isRateLimited } from "@/lib/rate-limit";
import { getSession, type SessionUser } from "@/lib/session";

const uuid = z.uuid();

export async function savePracticeTakeAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const session = await getSession();
  if (!session) return err("unauthenticated", "Sign in first.");
  const user = session.user as SessionUser;
  const audio = formData.get("audio");
  const recipeId = Number(formData.get("recipeId"));
  const durationMs = Number(formData.get("durationMs"));
  if (!(audio instanceof File) || !Number.isFinite(recipeId) || !Number.isFinite(durationMs)) return err("bad_input", "Invalid save request.");
  if (isRateLimited(`practice:${user.id}`, 20, 60_000)) return err("rate_limited", "Slow down a moment.");
  const db = await getDb();
  let store: ReturnType<typeof getTakeAudioStore>;
  try {
    store = getTakeAudioStore();
  } catch {
    return err("storage_unavailable", "Audio storage is not set up yet; the recording is still on this device.");
  }
  const result = await savePracticeTake(db, store, {
    userId: user.id,
    plan: user.plan as "free",
    recipeId,
    bytes: new Uint8Array(await audio.arrayBuffer()),
    mime: audio.type || "audio/webm",
    durationMs,
  });
  if (result.ok) revalidatePath("/practice");
  return result;
}

export async function deletePracticeTakeAction(id: string): Promise<ActionResult<null>> {
  const session = await getSession();
  if (!session) return err("unauthenticated", "Sign in first.");
  if (!uuid.safeParse(id).success) return err("bad_input", "Invalid take.");
  const db = await getDb();
  let store: ReturnType<typeof getTakeAudioStore>;
  try {
    store = getTakeAudioStore();
  } catch {
    store = { put: async () => "", get: async () => null, delete: async () => undefined };
  }
  const result = await deletePracticeTake(db, store, { userId: session.user.id, id });
  if (result.ok) revalidatePath("/practice");
  return result;
}
