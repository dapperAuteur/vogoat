import type { ExtractTablesWithRelations } from "drizzle-orm";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import ws from "ws";
import { env, hasDatabaseUrl, isProduction } from "@/lib/env";
import * as schema from "./schema";

export type Schema = typeof schema;
/** Driver-agnostic database type: Neon in deployed environments, embedded PGlite locally. */
export type Db = PgDatabase<PgQueryResultHKT, Schema, ExtractTablesWithRelations<Schema>>;
export type DbDriver = "neon" | "pglite";

declare global {
  // Survives Next.js dev HMR: a second PGlite on the same directory would fight for its lock.
  var __vogoatDb: Promise<Db> | undefined;
}

async function create(): Promise<Db> {
  if (hasDatabaseUrl) {
    // Neon's websocket driver needs a Node WebSocket implementation; one connection per
    // serverless instance, Vercel scales by instance count.
    neonConfig.webSocketConstructor = ws;
    const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });
    return drizzleNeon(pool, { schema }) as unknown as Db;
  }
  if (isProduction) {
    throw new Error("DATABASE_URL is required in production (plans/user-tasks/01-provision-infrastructure.md).");
  }
  // Zero-setup local database (dev/test only). Imported dynamically so the deployed function
  // never loads PGlite or reads the migrations folder: those exist for local development, and
  // a static import made Vercel's function crash at module load (observed on /api/health).
  const [{ PGlite }, { drizzle: drizzlePglite }, { migrate }] = await Promise.all([
    import("@electric-sql/pglite"),
    import("drizzle-orm/pglite"),
    import("drizzle-orm/pglite/migrator"),
  ]);
  const client = new PGlite(process.env.PGLITE_DIR ?? "./.data/pglite");
  const pg = drizzlePglite(client, { schema });
  await migrate(pg, { migrationsFolder: "./src/db/migrations" });
  return pg as unknown as Db;
}

/** The one way to a database handle; resolves after PGlite has applied migrations locally. */
export function getDb(): Promise<Db> {
  globalThis.__vogoatDb ??= create();
  return globalThis.__vogoatDb;
}

export function dbDriver(): DbDriver {
  return hasDatabaseUrl ? "neon" : "pglite";
}

export { schema };
