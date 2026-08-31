import { boolean, date, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

// The Workshop (PRD §9): one literary device per day in a shuffled no-repeat cycle, BAM writes,
// the entry saves. Gated by role, never by a hardcoded user (invariant 7).

export const literaryDevice = pgTable("literary_device", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  definition: text("definition").notNull(),
  example1: text("example_1").notNull(),
  example2: text("example_2").notNull(),
  example3: text("example_3").notNull(),
});

export const workshopDaily = pgTable(
  "workshop_daily",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayDate: date("day_date").notNull().unique(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => literaryDevice.id),
    cycle: integer("cycle").notNull(),
  },
  (t) => [unique("workshop_daily_device_cycle_uq").on(t.deviceId, t.cycle)],
);

export const workshopEntry = pgTable(
  "workshop_entry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dayDate: date("day_date").notNull(),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => literaryDevice.id),
    body: text("body").notNull(),
    isScriptCandidate: boolean("is_script_candidate").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("workshop_entry_user_day_uq").on(t.userId, t.dayDate)],
);
