import { index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { take } from "./game";

// Sharing is pull, not push (PRD §11 rule 2): an unguessable, revocable, noindex link per
// kept take, and a report on every shared page.

export const reportStatusEnum = pgEnum("report_status", ["open", "actioned", "dismissed"]);

export const share = pgTable(
  "share",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    takeId: uuid("take_id")
      .notNull()
      .unique()
      .references(() => take.id, { onDelete: "cascade" }),
    slug: text("slug").notNull().unique(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("share_slug_idx").on(t.slug)],
);

export const report = pgTable(
  "report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    shareId: uuid("share_id")
      .notNull()
      .references(() => share.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    detail: text("detail"),
    status: reportStatusEnum("status").notNull().default("open"),
    handledBy: text("handled_by").references(() => user.id),
    handledAt: timestamp("handled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("report_status_idx").on(t.status)],
);

export type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
