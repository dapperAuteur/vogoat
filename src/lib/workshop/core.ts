import { and, asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { literaryDevice, script, workshopDaily, workshopEntry } from "@/db/schema";
import { err, ok, type ActionResult } from "@/lib/action-result";
import type { DayKey } from "@/lib/game/day";
import { randomInt, seededRandom } from "@/lib/game/random";
import { computeStreaks, type Streaks } from "@/lib/game/streak";

// The Workshop (PRD §9): one literary device per day in a shuffled cycle with no repeats
// until every device has appeared, then reshuffle (cycle + 1). Assignments are per-date and
// shared-daily-philosophy deterministic; entries are private, saved forever, and can feed the
// script-triage queue (the loop-closer).

export type DeviceView = {
  id: string;
  name: string;
  definition: string;
  examples: [string, string, string];
};

export type WorkshopAssignment = { dayKey: string; cycle: number; device: DeviceView };

function toDeviceView(d: typeof literaryDevice.$inferSelect): DeviceView {
  return { id: d.id, name: d.name, definition: d.definition, examples: [d.example1, d.example2, d.example3] };
}

/** Today's device, creating the assignment if the date is new. Race-safe on the unique date. */
export async function getWorkshopAssignment(db: Db, today: DayKey): Promise<WorkshopAssignment | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const existing = await db
      .select({ w: workshopDaily, d: literaryDevice })
      .from(workshopDaily)
      .innerJoin(literaryDevice, eq(literaryDevice.id, workshopDaily.deviceId))
      .where(eq(workshopDaily.dayDate, today));
    if (existing[0]) return { dayKey: today, cycle: existing[0].w.cycle, device: toDeviceView(existing[0].d) };

    const devices = await db.select().from(literaryDevice).orderBy(asc(literaryDevice.name));
    if (devices.length === 0) return null;
    const assignments = await db.select({ deviceId: workshopDaily.deviceId, cycle: workshopDaily.cycle }).from(workshopDaily);
    const currentCycle = assignments.reduce((max, a) => Math.max(max, a.cycle), 1);
    const usedInCycle = new Set(assignments.filter((a) => a.cycle === currentCycle).map((a) => a.deviceId));
    let cycle = currentCycle;
    let unused = devices.filter((d) => !usedInCycle.has(d.id));
    if (unused.length === 0) {
      cycle = currentCycle + 1;
      unused = devices;
    }
    const pick = unused[randomInt(seededRandom(`workshop:${today}:${attempt}`), unused.length)];
    try {
      await db.insert(workshopDaily).values({ dayDate: today, deviceId: pick.id, cycle });
      return { dayKey: today, cycle, device: toDeviceView(pick) };
    } catch (error: unknown) {
      if (!isUniqueViolation(error)) throw error; // lost a race on the date (or device+cycle); re-read
    }
  }
  const final = await db
    .select({ w: workshopDaily, d: literaryDevice })
    .from(workshopDaily)
    .innerJoin(literaryDevice, eq(literaryDevice.id, workshopDaily.deviceId))
    .where(eq(workshopDaily.dayDate, today));
  return final[0] ? { dayKey: today, cycle: final[0].w.cycle, device: toDeviceView(final[0].d) } : null;
}

const CANDIDATE_MARKER = (entryId: string) => `workshop-entry:${entryId}`;

/** Upsert the day's entry; the script-candidate flag feeds (or retracts from) triage. */
export async function saveWorkshopEntry(
  db: Db,
  args: { userId: string; dayKey: DayKey; deviceId: string; body: string; isScriptCandidate: boolean },
): Promise<ActionResult<{ entryId: string }>> {
  const body = args.body.trim();
  if (body.length === 0) return err("empty", "Write something first.");
  if (body.length > 20_000) return err("too_long", "That is beyond a daily exercise.");
  const [entry] = await db
    .insert(workshopEntry)
    .values({ userId: args.userId, dayDate: args.dayKey, deviceId: args.deviceId, body, isScriptCandidate: args.isScriptCandidate })
    .onConflictDoUpdate({
      target: [workshopEntry.userId, workshopEntry.dayDate],
      set: { body, isScriptCandidate: args.isScriptCandidate, deviceId: args.deviceId, updatedAt: new Date() },
    })
    .returning();

  // Loop-closer (PRD §9): flagged entries land in the script-triage queue exactly once;
  // unflagging retracts the candidate only while BAM has not triaged it.
  const marker = CANDIDATE_MARKER(entry.id);
  const [existing] = await db.select().from(script).where(eq(script.notes, marker));
  if (args.isScriptCandidate && !existing) {
    await db.insert(script).values({ body, batch: 0, status: "candidate", notes: marker });
  } else if (args.isScriptCandidate && existing && existing.status === "candidate") {
    await db.update(script).set({ body }).where(eq(script.id, existing.id));
  } else if (!args.isScriptCandidate && existing && existing.status === "candidate") {
    await db.delete(script).where(eq(script.id, existing.id));
  }
  return ok({ entryId: entry.id });
}

export async function getWorkshopEntry(db: Db, userId: string, dayKey: DayKey) {
  const [entry] = await db
    .select()
    .from(workshopEntry)
    .where(and(eq(workshopEntry.userId, userId), eq(workshopEntry.dayDate, dayKey)));
  return entry ?? null;
}

export async function listWorkshopEntries(db: Db, userId: string) {
  return db
    .select({ e: workshopEntry, deviceName: literaryDevice.name })
    .from(workshopEntry)
    .innerJoin(literaryDevice, eq(literaryDevice.id, workshopEntry.deviceId))
    .where(eq(workshopEntry.userId, userId))
    .orderBy(desc(workshopEntry.dayDate));
}

export async function workshopStreaks(db: Db, userId: string, today: DayKey): Promise<Streaks> {
  const rows = await db
    .select({ dayDate: workshopEntry.dayDate })
    .from(workshopEntry)
    .where(eq(workshopEntry.userId, userId));
  return computeStreaks(rows.map((r) => r.dayDate), today);
}

/** How far the current cycle has run, for the page's "device N of M" line. */
export async function cycleProgress(db: Db, cycle: number): Promise<{ used: number; total: number }> {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(literaryDevice);
  const [{ used }] = await db.select({ used: sql<number>`count(*)::int` }).from(workshopDaily).where(eq(workshopDaily.cycle, cycle));
  return { used, total };
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current instanceof Error) {
    if (/unique|duplicate key|23505/i.test(current.message)) return true;
    current = current.cause;
  }
  return false;
}
