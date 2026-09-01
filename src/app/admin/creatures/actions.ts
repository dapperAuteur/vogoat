"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db/client";
import { setAnimalVerdict } from "@/lib/creatures/vetting";
import { VERDICTS } from "@/lib/scripts/triage";
import { requireAdmin } from "@/lib/session";

const input = z.object({ animal: z.string().min(2).max(32), verdict: z.enum(VERDICTS) });

export async function submitAnimalVerdict(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = input.safeParse({ animal: formData.get("animal"), verdict: formData.get("verdict") });
  if (!parsed.success) return;
  const db = await getDb();
  await setAnimalVerdict(db, parsed.data.animal, parsed.data.verdict);
  revalidatePath("/admin/creatures");
}
