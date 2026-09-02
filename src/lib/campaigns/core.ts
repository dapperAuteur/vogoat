import { randomBytes } from "node:crypto";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db/client";
import { campaign, user } from "@/db/schema";
import { err, ok, type ActionResult } from "@/lib/action-result";
import { env, isProduction } from "@/lib/env";

/**
 * Announcement emails to players who asked for them (plans/future/03).
 *
 * Consent is opt-in and is never assumed: `user.marketingConsent` defaults to false in the
 * schema, only the player's own checkbox turns it on, and one click on the unsubscribe link
 * turns it off again. Nothing here reads or writes a take, a streak, or the daily, so the
 * 1/day invariant is untouched.
 */

/** The only thing a campaign needs from the mail layer; tests pass a collector instead. */
export type Mailer = (message: { to: string; subject: string; text: string }) => Promise<void>;

export type CampaignRow = typeof campaign.$inferSelect;

export const SUBJECT_MAX = 140;
export const BODY_MAX = 5000;

/** Unguessable, per-account, and stable once issued so old emails keep working. */
export function newUnsubscribeToken(): string {
  return randomBytes(16).toString("base64url");
}

/** Never log an address; a user id is enough to find the row without leaking contact data. */
function logDeliveryFailure(userId: string, error: unknown): void {
  const kind = error instanceof Error ? error.constructor.name : "unknown";
  console.error(`[campaigns] delivery failed for user ${userId}: ${kind}`);
}

export function unsubscribeUrl(token: string, appUrl: string = env.APP_URL): string {
  return `${appUrl.replace(/\/+$/, "")}/unsubscribe/${token}`;
}

/**
 * Turns marketing email on or off for one account. Turning it on issues an unsubscribe token
 * if the account has none yet, so every message can carry a working opt-out.
 */
export async function setMarketingConsent(
  db: Db,
  userId: string,
  consent: boolean,
): Promise<ActionResult<{ consent: boolean }>> {
  const [row] = await db
    .select({ id: user.id, token: user.unsubscribeToken })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  if (!row) return err("not_found", "That account was not found.");
  await db
    .update(user)
    .set({
      marketingConsent: consent,
      unsubscribeToken: consent ? (row.token ?? newUnsubscribeToken()) : row.token,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));
  return ok({ consent });
}

export async function getMarketingConsent(db: Db, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ consent: user.marketingConsent })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row?.consent ?? false;
}

/** One click from an email: flips consent off. An unknown token is not an error, just a miss. */
export async function unsubscribeByToken(db: Db, token: string): Promise<"unsubscribed" | "unknown"> {
  if (!token || token.length > 200) return "unknown";
  const updated = await db
    .update(user)
    .set({ marketingConsent: false, updatedAt: new Date() })
    .where(eq(user.unsubscribeToken, token))
    .returning({ id: user.id });
  return updated.length > 0 ? "unsubscribed" : "unknown";
}

/** How many accounts a campaign would reach right now. */
export async function countEligibleRecipients(db: Db): Promise<number> {
  const [row] = await db.select({ n: count() }).from(user).where(eq(user.marketingConsent, true));
  return row?.n ?? 0;
}

export async function listCampaigns(db: Db, limit = 50): Promise<CampaignRow[]> {
  return db.select().from(campaign).orderBy(desc(campaign.createdAt)).limit(limit);
}

export async function getCampaign(db: Db, id: string): Promise<CampaignRow | null> {
  const [row] = await db.select().from(campaign).where(eq(campaign.id, id)).limit(1);
  return row ?? null;
}

function cleanDraft(input: { subject: string; body: string }): { subject: string; body: string } | null {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 3 || subject.length > SUBJECT_MAX) return null;
  if (body.length < 10 || body.length > BODY_MAX) return null;
  return { subject, body };
}

export async function createDraft(
  db: Db,
  input: { subject: string; body: string },
): Promise<ActionResult<{ id: string }>> {
  const clean = cleanDraft(input);
  if (!clean) return err("bad_input", "Give the campaign a subject and a body first.");
  const [row] = await db.insert(campaign).values({ ...clean, status: "draft" }).returning({ id: campaign.id });
  return ok({ id: row.id });
}

/** Only a draft can be edited; a sent campaign is history. */
export async function updateDraft(
  db: Db,
  id: string,
  input: { subject: string; body: string },
): Promise<ActionResult<{ id: string }>> {
  const clean = cleanDraft(input);
  if (!clean) return err("bad_input", "Give the campaign a subject and a body first.");
  const updated = await db
    .update(campaign)
    .set(clean)
    .where(and(eq(campaign.id, id), eq(campaign.status, "draft")))
    .returning({ id: campaign.id });
  if (updated.length === 0) return err("wrong_state", "That campaign is not a draft any more.");
  return ok({ id: updated[0].id });
}

export type SendReport = { recipientCount: number; eligible: number; failed: number };

/**
 * Sends one campaign to every consenting account, one message at a time.
 *
 * Safe to call twice: the draft is claimed with a conditional update, so a second call finds
 * the campaign in `sending` or `sent` and is refused. A recipient whose message fails is
 * logged and skipped; the rest of the run continues, and `recipientCount` records how many
 * messages actually went out.
 */
export async function sendCampaign(
  db: Db,
  mailer: Mailer,
  id: string,
  options: { appUrl?: string } = {},
): Promise<ActionResult<SendReport>> {
  const existing = await getCampaign(db, id);
  if (!existing) return err("not_found", "That campaign was not found.");
  if (existing.status !== "draft") {
    return err("already_sent", "That campaign has already been sent. Write a new one instead.");
  }

  const recipients = await db
    .select({ id: user.id, email: user.email, token: user.unsubscribeToken })
    .from(user)
    .where(eq(user.marketingConsent, true));
  if (recipients.length === 0) {
    return err("no_recipients", "Nobody has opted in yet, so there is no one to send to. The draft is untouched.");
  }

  // The double-send guard: whoever flips draft to sending owns the run.
  const claimed = await db
    .update(campaign)
    .set({ status: "sending" })
    .where(and(eq(campaign.id, id), eq(campaign.status, "draft")))
    .returning({ id: campaign.id });
  if (claimed.length === 0) {
    return err("already_sent", "That campaign is already going out. Give it a moment.");
  }

  const appUrl = options.appUrl ?? env.APP_URL;
  let sent = 0;
  let failed = 0;
  for (const recipient of recipients) {
    let token = recipient.token;
    if (!token) {
      token = newUnsubscribeToken();
      await db.update(user).set({ unsubscribeToken: token }).where(eq(user.id, recipient.id));
    }
    try {
      await mailer({
        to: recipient.email,
        subject: existing.subject,
        text: `${existing.body}\n\n---\nYou get this because you asked VO GOAT to email you. Unsubscribe in one click: ${unsubscribeUrl(token, appUrl)}`,
      });
      sent++;
    } catch (error: unknown) {
      failed++;
      logDeliveryFailure(recipient.id, error);
    }
  }

  await db
    .update(campaign)
    .set({ status: "sent", recipientCount: sent, sentAt: new Date() })
    .where(eq(campaign.id, id));

  if (failed > 0 && isProduction) {
    console.error(`[campaigns] ${id}: ${sent} sent, ${failed} failed`);
  }
  return ok({ recipientCount: sent, eligible: recipients.length, failed });
}

/** Accounts that consented before tokens existed; kept for a one-off backfill if ever needed. */
export async function backfillMissingTokens(db: Db): Promise<number> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.marketingConsent, true), isNull(user.unsubscribeToken)));
  for (const row of rows) {
    await db.update(user).set({ unsubscribeToken: newUnsubscribeToken() }).where(eq(user.id, row.id));
  }
  return rows.length;
}
