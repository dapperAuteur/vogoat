import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import ws from "ws";

// Applies ./src/db/migrations to a Neon database. The local PGlite database migrates itself
// on first use, so this script is only for Neon (dev via .env.local, prod via the shell).
neonConfig.webSocketConstructor = ws;

const connectionString =
  process.env.DATABASE_URL ?? process.env.STORAGE_DATABASE_URL ?? process.env.STORAGE_POSTGRES_URL;
if (!connectionString || connectionString.includes("placeholder")) {
  const isProd = process.env.npm_lifecycle_event === "db:migrate:prod";
  console.error(
    isProd
      ? "DATABASE_URL is not set. `pnpm db:migrate:prod` deliberately loads no .env file: `set -a; source .env.prod; set +a; pnpm db:migrate:prod`."
      : "DATABASE_URL is not set. Local development uses the embedded PGlite database, which migrates itself; put a Neon connection string in .env.local to migrate Neon.",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function main() {
  console.log("Applying migrations from ./src/db/migrations");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations applied.");
  await pool.end();
}

main().catch((error: unknown) => {
  console.error("Migration failed:", error instanceof Error ? error.constructor.name : "unknown error");
  pool.end().finally(() => process.exit(1));
});
