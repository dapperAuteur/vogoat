import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/db/client";
import * as schema from "@/db/schema";
import { setScriptVerdict } from "@/lib/scripts/triage";

const client = new PGlite();
const pg = drizzle(client, { schema });
const db = pg as unknown as Db;
let id = "";

beforeAll(async () => {
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  const [s] = await db.insert(schema.script).values({ body: "Bin day is tomorrow.", batch: 1 }).returning();
  id = s.id;
});
afterAll(async () => {
  await client.close();
});

describe("script triage (PRD §8)", () => {
  it("records a verdict with decidedAt and allows re-triage", async () => {
    expect(await setScriptVerdict(db, id, "use")).toBe("use");
    const [row] = await db.select().from(schema.script).where(eq(schema.script.id, id));
    expect(row.status).toBe("use");
    expect(row.decidedAt).not.toBeNull();
    expect(await setScriptVerdict(db, id, "never")).toBe("never");
  });

  it("returns null for an unknown id", async () => {
    expect(await setScriptVerdict(db, "00000000-0000-0000-0000-000000000000", "backlog")).toBeNull();
  });
});

describe("animal vetting (plans/future/02)", () => {
  it("lazy-seeds every vettable animal and records verdicts", async () => {
    const { listAnimalVerdicts, setAnimalVerdict, VETTABLE_ANIMALS } = await import("@/lib/creatures/vetting");
    const rows = await listAnimalVerdicts(db);
    expect(rows.map((r) => r.animal).sort()).toEqual([...VETTABLE_ANIMALS].sort());
    expect(rows.every((r) => r.status === "candidate")).toBe(true);
    expect(await setAnimalVerdict(db, "mouse", "never")).toBe(true);
    expect(await setAnimalVerdict(db, "unicorn", "never")).toBe(false);
    const after = await listAnimalVerdicts(db);
    expect(after.find((r) => r.animal === "mouse")?.status).toBe("never");
    expect(await listAnimalVerdicts(db)).toHaveLength(rows.length); // idempotent
  });
});
