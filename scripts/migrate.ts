import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

// Applies ./src/db/migrations to a Neon database. The local PGlite database migrates itself
// on first use, so this script is only for Neon.
//
// Where the URL comes from: `pnpm db:migrate` loads .env.local; `pnpm db:migrate:prod:file`
// loads .env.prod; `pnpm db:migrate:prod` reads only the shell. Node parses the env file
// itself (`--env-file`), because `source`-ing a dotenv file breaks on the `&` inside Neon
// connection strings. Vercel's Neon integration prefixes its variables (STORAGE_...), and a
// direct (unpooled) connection is preferred for DDL when one is available.
neonConfig.webSocketConstructor = ws;

const CANDIDATES = [
  "DATABASE_URL_UNPOOLED",
  "STORAGE_DATABASE_URL_UNPOOLED",
  "POSTGRES_URL_NON_POOLING",
  "STORAGE_POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  "STORAGE_DATABASE_URL",
  "POSTGRES_URL",
  "STORAGE_POSTGRES_URL",
] as const;

const source = CANDIDATES.find((name) => {
  const value = process.env[name];
  return value && value.trim() !== "" && !value.includes("placeholder");
});
const connectionString = source ? process.env[source] : undefined;

if (!connectionString) {
  const isProd = process.env.npm_lifecycle_event === "db:migrate:prod";
  console.error(
    isProd
      ? "No database URL in the shell. Either `export DATABASE_URL='postgres://…'` first, or run `pnpm db:migrate:prod:file` to let node read .env.prod (do not `source` the file; shells choke on the `&` in Neon URLs)."
      : "No database URL found. Local development uses the embedded PGlite database, which migrates itself; put a Neon connection string (DATABASE_URL or the STORAGE_-prefixed Vercel names) in .env.local to migrate Neon.",
  );
  process.exit(1);
}

const host = new URL(connectionString).hostname;
console.log(`Using ${source} (host …${host.slice(host.indexOf("."))})`);

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function main() {
  console.log("Applying migrations from ./src/db/migrations");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations applied.");
  await pool.end();
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? `${error.constructor.name}: ${error.message}` : "unknown error");
  pool.end().finally(() => process.exit(1));
});
