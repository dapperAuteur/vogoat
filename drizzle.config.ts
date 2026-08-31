import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` never connects; the URL only matters for `push`/`studio`
// against a real Neon database.
const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.STORAGE_DATABASE_URL ??
  process.env.STORAGE_POSTGRES_URL ??
  "postgres://placeholder:placeholder@localhost/vogoat_dev";

export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
