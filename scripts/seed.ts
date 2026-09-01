import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { getDb, dbDriver } from "../src/db/client";
import { literaryDevice, script } from "../src/db/schema";

// Idempotent seed, safe for any environment: literary devices (PRD §9) and script batch 01 as
// `candidate` (invariant 3: nothing is approved here; BAM's verdicts flip status later).

/** Prints the full cause chain; PGlite failures usually bury the real reason one level down. */
function explain(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    parts.push(`${current.constructor.name}: ${current.message}`);
    current = current.cause;
  }
  return parts.join("\n  caused by ") || "unknown error";
}

function hint(text: string): string {
  if (/CREATE SCHEMA|lock|access handle|NoModificationAllowed|corrupt/i.test(text)) {
    return (
      "\nHint: the embedded database (./.data/pglite) supports ONE process at a time and is disposable dev data." +
      "\n  - If `pnpm dev` is running against it, stop the dev server first (or triage in-app at /admin/scripts instead)." +
      "\n  - If it persists, delete the directory (`rm -rf .data/pglite`); it reseeds in seconds."
    );
  }
  return "";
}

async function main() {
  const db = await getDb();
  console.log(`Seeding via ${dbDriver()}`);

  const devices = parse(readFileSync("data/literary-devices.csv"), { columns: true }) as Record<string, string>[];
  const insertedDevices = await db
    .insert(literaryDevice)
    .values(
      devices.map((d) => ({
        name: d.device,
        definition: d.definition,
        example1: d.example_1,
        example2: d.example_2,
        example3: d.example_3,
      })),
    )
    .onConflictDoNothing({ target: literaryDevice.name })
    .returning({ id: literaryDevice.id });
  console.log(`literary devices: ${devices.length} in file, ${insertedDevices.length} inserted`);

  const batch = parse(readFileSync("data/scripts-batch-01.csv"), { columns: true }) as { n: string; body: string; note: string }[];
  const existing = new Set((await db.select({ body: script.body }).from(script)).map((r) => r.body));
  const fresh = batch.filter((s) => !existing.has(s.body));
  if (fresh.length > 0) {
    await db.insert(script).values(fresh.map((s) => ({ body: s.body, batch: 1, status: "candidate" as const, notes: s.note || null })));
  }
  console.log(`scripts batch 01: ${batch.length} in file, ${fresh.length} inserted as candidate`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const text = explain(error);
    console.error(`Seed failed: ${text}${hint(text)}`);
    process.exit(1);
  });
