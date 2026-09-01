import { sql } from "drizzle-orm";
import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { CreatureLayers } from "@/lib/game/creature";
import type { Recipe, Wheel } from "@/lib/game/recipe";
import { user } from "./auth";

// The daily game (PRD §6, §12). One authored `daily` per calendar date; one `take` row per
// registered attempt; the two take indexes below carry the game's integrity rules.

export const scriptStatusEnum = pgEnum("script_status", ["candidate", "use", "backlog", "never"]);
export const dailyStatusEnum = pgEnum("daily_status", ["draft", "approved", "published", "auto"]);
export const takeStatusEnum = pgEnum("take_status", ["recorded", "kept", "submitted", "discarded"]);
export const purchaseKindEnum = pgEnum("purchase_kind", ["lifetime"]);
export const claimStatusEnum = pgEnum("claim_status", ["pending", "verified", "rejected"]);

/** Micro-scripts. Only `use`/`backlog` may ever be paired into a daily (invariant 3). */
export const script = pgTable(
  "script",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    body: text("body").notNull(),
    status: scriptStatusEnum("status").notNull().default("candidate"),
    batch: integer("batch").notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    notes: text("notes"),
    usedOn: date("used_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("script_status_idx").on(t.status)],
);

/** A creature derived from a recipe (invariant 6); art is rendered from `layers`. */
export const creature = pgTable("creature", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  baseAnimal: text("base_animal").notNull(),
  layers: jsonb("layers").$type<CreatureLayers>().notNull(),
  // Reserved by the PRD for a pre-rendered image; v1 renders the SVG from `layers` on demand
  // (page and share image share one renderer), so this stays null until a CDN copy exists.
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * BAM's animal vetting (plans/future/02, 2026-09-01): same ritual as scripts. Animals are
 * LIVE unless marked `never` (a default-off rule would black out the daily before vetting);
 * `candidate` means not yet vetted, `use`/`backlog` record an explicit yes.
 */
export const animalVerdict = pgTable("animal_verdict", {
  id: uuid("id").primaryKey().defaultRandom(),
  animal: text("animal").notNull().unique(),
  status: scriptStatusEnum("status").notNull().default("candidate"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** The authored unit: (recipe, script, creature) for one calendar date. */
export const daily = pgTable(
  "daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayDate: date("day_date").notNull().unique(),
    // The recipe's index in data/voice-recipes.csv (1..11664); unique so a recipe is never reused.
    recipeId: integer("recipe_id").notNull(),
    recipe: jsonb("recipe").$type<Recipe>().notNull(),
    scriptId: uuid("script_id")
      .notNull()
      .references(() => script.id),
    creatureId: uuid("creature_id")
      .notNull()
      .references(() => creature.id),
    status: dailyStatusEnum("status").notNull().default("draft"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("daily_recipe_id_uq").on(t.recipeId), index("daily_status_idx").on(t.status)],
);

/** One row per attempt, registered at record-start for signed-in users (invariant 2). */
export const take = pgTable(
  "take",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dailyId: uuid("daily_id")
      .notNull()
      .references(() => daily.id),
    takeNumber: integer("take_number").notNull(),
    status: takeStatusEnum("status").notNull().default("recorded"),
    blobUrl: text("blob_url"),
    durationMs: integer("duration_ms"),
    mime: text("mime"),
    sizeBytes: integer("size_bytes"),
    // Additive (BAM, 2026-08-31): client-computed waveform peaks so share pages can draw a
    // waveform without decoding audio, and the no-ML self-check of which wheels were hit.
    peaks: jsonb("peaks").$type<number[]>(),
    selfCheck: jsonb("self_check").$type<Partial<Record<Wheel, boolean>>>(),
    // created_at + 30 days for the free plan; cleared on upgrade (invariant 8).
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    // Caps attempts: take numbers are dense per (user, daily).
    unique("take_user_daily_number_uq").on(t.userId, t.dailyId, t.takeNumber),
    // Invariant 1: one submission per day per account, for every tier, in the schema.
    uniqueIndex("take_one_submission_per_day_uq")
      .on(t.userId, t.dailyId)
      .where(sql`${t.status} = 'submitted'`),
    index("take_user_idx").on(t.userId),
    index("take_expires_idx").on(t.expiresAt),
  ],
);

/** Paid practice mode. Never joins the daily game. */
export const practiceTake = pgTable(
  "practice_take",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id").notNull(),
    recipe: jsonb("recipe").$type<Recipe>().notNull(),
    blobUrl: text("blob_url"),
    durationMs: integer("duration_ms"),
    mime: text("mime"),
    sizeBytes: integer("size_bytes"),
    peaks: jsonb("peaks").$type<number[]>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("practice_take_user_idx").on(t.userId)],
);

export const purchase = pgTable("purchase", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: purchaseKindEnum("kind").notNull(),
  stripeCheckoutId: text("stripe_checkout_id").notNull().unique(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("usd"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Manual $100 Cash App lifetime flow (BAM 2026-09-01, mirroring FlashLearnAI): pay the QR,
 * submit your Cash App name, BAM verifies in /admin/cashapp. */
export const cashappClaim = pgTable("cashapp_claim", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  cashAppName: text("cash_app_name").notNull(),
  status: claimStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScriptStatus = (typeof scriptStatusEnum.enumValues)[number];
export type DailyStatus = (typeof dailyStatusEnum.enumValues)[number];
export type TakeStatus = (typeof takeStatusEnum.enumValues)[number];
