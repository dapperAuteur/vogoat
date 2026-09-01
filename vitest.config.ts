import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    testTimeout: 30_000,
    // Each db test file boots its own in-memory PGlite (WASM); too many at once starve each
    // other during migrate() and blow the default 10s hook timeout (seen 2026-09-01).
    hookTimeout: 60_000,
    poolOptions: { threads: { maxThreads: 4 } },
  },
});
