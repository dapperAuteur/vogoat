"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { setScriptVerdict, VERDICTS } from "@/lib/scripts/triage";
import { requireAdmin } from "@/lib/session";

const input = z.object({ id: z.uuid(), verdict: z.enum(VERDICTS) });

export async function submitVerdict(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = input.safeParse({ id: formData.get("id"), verdict: formData.get("verdict") });
  if (!parsed.success) return;
  const db = await getDb();
  await setScriptVerdict(db, parsed.data.id, parsed.data.verdict);
  revalidatePath("/admin/scripts");
}
