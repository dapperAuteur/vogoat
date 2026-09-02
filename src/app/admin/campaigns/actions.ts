"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db/client";
import { BODY_MAX, SUBJECT_MAX, createDraft, sendCampaign, updateDraft } from "@/lib/campaigns/core";
import { sendEmail } from "@/lib/mailer";
import { requireAdmin } from "@/lib/session";

const draftInput = z.object({
  subject: z.string().min(3).max(SUBJECT_MAX),
  body: z.string().min(10).max(BODY_MAX),
});

function back(query: string): never {
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns?${query}`);
}

export async function createCampaignDraft(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = draftInput.safeParse({ subject: formData.get("subject"), body: formData.get("body") });
  if (!parsed.success) back("problem=bad_input");
  const db = await getDb();
  const result = await createDraft(db, parsed.data);
  back(result.ok ? "done=drafted" : `problem=${result.code}`);
}

export async function updateCampaignDraft(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  const parsed = draftInput.safeParse({ subject: formData.get("subject"), body: formData.get("body") });
  if (typeof id !== "string" || !parsed.success) back("problem=bad_input");
  const db = await getDb();
  const result = await updateDraft(db, id, parsed.data);
  back(result.ok ? "done=saved" : `problem=${result.code}`);
}

/** Sending is admin-only and guarded twice: the role check here, the draft claim in core. */
export async function sendCampaignNow(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") back("problem=bad_input");
  const db = await getDb();
  const result = await sendCampaign(db, (message) => sendEmail(message), id);
  back(result.ok ? `done=sent&n=${result.data.recipientCount}&failed=${result.data.failed}` : `problem=${result.code}`);
}
