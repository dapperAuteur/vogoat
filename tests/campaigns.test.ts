import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import {
  countEligibleRecipients,
  createDraft,
  listCampaigns,
  sendCampaign,
  setMarketingConsent,
  unsubscribeByToken,
  updateDraft,
  type Mailer,
} from "@/lib/campaigns/core";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;

type Sent = { to: string; subject: string; text: string };

function collector(): { mailer: Mailer; sent: Sent[] } {
  const sent: Sent[] = [];
  return {
    sent,
    mailer: async (message) => {
      sent.push(message);
    },
  };
}

async function makeUser(id: string): Promise<void> {
  await db.insert(schema.user).values({ id, name: id, email: `${id}@example.test` });
}

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  await makeUser("in-a");
  await makeUser("in-b");
  await makeUser("out-c");
});
afterAll(async () => {
  await client.close();
});

describe("marketing consent", () => {
  it("is off for a new account and issues no token until the player opts in", async () => {
    const rows = await db.select().from(schema.user);
    expect(rows.every((r) => r.marketingConsent === false)).toBe(true);
    expect(rows.every((r) => r.unsubscribeToken === null)).toBe(true);
    expect(await countEligibleRecipients(db)).toBe(0);
  });

  it("opting in sets consent and mints an unsubscribe token once", async () => {
    const first = await setMarketingConsent(db, "in-a", true);
    expect(first.ok).toBe(true);
    const [a] = await db.select().from(schema.user).where(eq(schema.user.id, "in-a"));
    expect(a.marketingConsent).toBe(true);
    expect(a.unsubscribeToken).toBeTruthy();
    // The token is stable, so links in older emails keep working.
    await setMarketingConsent(db, "in-a", false);
    await setMarketingConsent(db, "in-a", true);
    const [again] = await db.select().from(schema.user).where(eq(schema.user.id, "in-a"));
    expect(again.unsubscribeToken).toBe(a.unsubscribeToken);

    await setMarketingConsent(db, "in-b", true);
    expect(await countEligibleRecipients(db)).toBe(2);
  });
});

describe("sendCampaign", () => {
  it("refuses politely when nobody has opted in", async () => {
    const [lonely] = await db.insert(schema.campaign).values({ subject: "Nobody home", body: "This should not go out." }).returning();
    await db.update(schema.user).set({ marketingConsent: false });
    const { mailer, sent } = collector();
    const result = await sendCampaign(db, mailer, lonely.id);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.code).toBe("no_recipients");
    expect(sent).toHaveLength(0);
    const [still] = await db.select().from(schema.campaign).where(eq(schema.campaign.id, lonely.id));
    expect(still.status).toBe("draft");
    // put the two opted-in players back
    await setMarketingConsent(db, "in-a", true);
    await setMarketingConsent(db, "in-b", true);
  });

  it("emails only consenting users, each with its own unsubscribe link", async () => {
    const draft = await createDraft(db, { subject: "Day 100", body: "A new wheel lands tomorrow." });
    if (!draft.ok) throw new Error(draft.code);
    const { mailer, sent } = collector();
    const result = await sendCampaign(db, mailer, draft.data.id, { appUrl: "https://vogoat.test" });
    if (!result.ok) throw new Error(result.code);

    expect(sent.map((m) => m.to).sort()).toEqual(["in-a@example.test", "in-b@example.test"]);
    expect(sent.some((m) => m.to === "out-c@example.test")).toBe(false);
    const tokens = new Set<string>();
    for (const message of sent) {
      const match = message.text.match(/https:\/\/vogoat\.test\/unsubscribe\/(\S+)/);
      expect(match).not.toBeNull();
      tokens.add(match ? match[1] : "");
      expect(message.subject).toBe("Day 100");
    }
    expect(tokens.size).toBe(2);

    const [row] = await db.select().from(schema.campaign).where(eq(schema.campaign.id, draft.data.id));
    expect(row.status).toBe("sent");
    expect(row.recipientCount).toBe(2);
    expect(row.sentAt).toBeInstanceOf(Date);
    expect(result.data).toEqual({ recipientCount: 2, eligible: 2, failed: 0 });
  });

  it("refuses a second send of the same campaign", async () => {
    const [sentRow] = await db.select().from(schema.campaign).where(eq(schema.campaign.status, "sent"));
    const { mailer, sent } = collector();
    const again = await sendCampaign(db, mailer, sentRow.id);
    expect(!again.ok && again.code).toBe("already_sent");
    expect(sent).toHaveLength(0);
    const [unchanged] = await db.select().from(schema.campaign).where(eq(schema.campaign.id, sentRow.id));
    expect(unchanged.recipientCount).toBe(2);
    // A sent campaign is history and cannot be edited back into a draft.
    const edit = await updateDraft(db, sentRow.id, { subject: "Rewritten", body: "Should not stick." });
    expect(!edit.ok && edit.code).toBe("wrong_state");
  });

  it("unsubscribing flips consent off and the next send skips that player", async () => {
    const [a] = await db.select().from(schema.user).where(eq(schema.user.id, "in-a"));
    expect(await unsubscribeByToken(db, a.unsubscribeToken as string)).toBe("unsubscribed");
    const [after] = await db.select().from(schema.user).where(eq(schema.user.id, "in-a"));
    expect(after.marketingConsent).toBe(false);
    expect(await countEligibleRecipients(db)).toBe(1);

    const next = await createDraft(db, { subject: "Day 101", body: "The wheel spun again." });
    if (!next.ok) throw new Error(next.code);
    const { mailer, sent } = collector();
    const result = await sendCampaign(db, mailer, next.data.id);
    if (!result.ok) throw new Error(result.code);
    expect(sent.map((m) => m.to)).toEqual(["in-b@example.test"]);
    expect(result.data.recipientCount).toBe(1);
  });

  it("treats an unknown token as a miss, never an error", async () => {
    expect(await unsubscribeByToken(db, "not-a-real-token")).toBe("unknown");
    expect(await unsubscribeByToken(db, "")).toBe("unknown");
  });

  it("keeps going when one recipient fails and records only what went out", async () => {
    await setMarketingConsent(db, "in-a", true);
    await setMarketingConsent(db, "out-c", true);
    const draft = await createDraft(db, { subject: "Day 102", body: "One address will bounce." });
    if (!draft.ok) throw new Error(draft.code);
    const delivered: string[] = [];
    const flaky: Mailer = async (message) => {
      if (message.to === "in-b@example.test") throw new Error("mailbox full");
      delivered.push(message.to);
    };
    const result = await sendCampaign(db, flaky, draft.data.id);
    if (!result.ok) throw new Error(result.code);
    expect(delivered.sort()).toEqual(["in-a@example.test", "out-c@example.test"]);
    expect(result.data).toEqual({ recipientCount: 2, eligible: 3, failed: 1 });
    const [row] = await db.select().from(schema.campaign).where(eq(schema.campaign.id, draft.data.id));
    expect(row.status).toBe("sent");
    expect(row.recipientCount).toBe(2);
  });

  it("lists campaigns newest first", async () => {
    const rows = await listCampaigns(db);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.map((r) => r.subject)).toContain("Day 102");
  });
});
