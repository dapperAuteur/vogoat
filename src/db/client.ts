import { PGlite } from "@electric-sql/pglite";
import { neonConfig, Pool } from "@neondatabase/serverless";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import ws from "ws";
import { env, hasDatabaseUrl, isProduction } from "@/lib/env";
import * as schema from "./schema";

export type Schema = typeof schema;
/** Driver-agnostic database type: Neon in deployed environments, embedded PGlite locally. */
export type Db = PgDatabase<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type DbDriver = "neon" | "pglite";

type Handle = { db: Db; driver: DbDriver; ready: Promise<void> };

declare global {
  // Survives Next.js dev HMR: a second PGlite on the same directory would fight for its lock.
  var __vogoatDb: Handle | undefined;
}

function create(): Handle {
  if (hasDatabaseUrl) {
    // Neon's websocket driver needs a Node WebSocket implementation; one connection per
    // serverless instance, Vercel scales by instance count.
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
    return { db: drizzleNeon(pool, { schema }) as unknown as Db, driver: "neon", ready: Promise.resolve() };
  }
  if (isProduction) {
    throw new Error("DATABASE_URL is required in production (plans/user-tasks/01-provision-infrastructure.md).");
  }
  // Zero-setup local database (BAM, 2026-08-31: nothing provisioned yet). Migrations apply
  // themselves on first use; `getDb()` awaits that.
  const client = new PGlite(process.env.PGLITE_DIR ?? "./.data/pglite");
  const pg = drizzlePglite(client, { schema });
  const ready = migratePglite(pg, { migrationsFolder: "./src/db/migrations" });
  return { db: pg as unknown as Db, driver: "pglite", ready };
}

function handle(): Handle {
  globalThis.__vogoatDb ??= create();
  return globalThis.__vogoatDb;
}

/** Await this before the first query in a request; it resolves immediately on Neon. */
export async function getDb(): Promise<Db> {
  const h = handle();
  await h.ready;
  return h.db;
}

export function dbDriver(): DbDriver {
  return handle().driver;
}

export { schema };
