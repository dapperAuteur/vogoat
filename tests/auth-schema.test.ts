import { getAuthTables } from "better-auth/db";
import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "@/db/schema";

// Guards against better-auth core-schema drift: 1.7.2 added account.issuer and the adapter
// fails AT RUNTIME ("field does not exist in the schema for the model") when a model field is
// missing from the drizzle table, which is exactly how production sign-in broke on 2026-08-31.
// A version bump that adds fields now fails here instead.
describe("drizzle schema covers better-auth's core models", () => {
  const tables = getAuthTables({});
  const ours: Record<string, PgTable> = {
    user: schema.user,
    session: schema.session,
    account: schema.account,
    verification: schema.verification,
  };

  for (const [model, def] of Object.entries(tables)) {
    it(`covers every field of "${model}"`, () => {
      const table = ours[def.modelName];
      expect(table, `model ${model} has no table`).toBeDefined();
      const columns = Object.keys(getTableColumns(table));
      for (const field of Object.keys(def.fields)) {
        expect(columns, `missing "${field}" on "${def.modelName}"`).toContain(field);
      }
    });
  }
});
