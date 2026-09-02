import { describe, expect, it } from "vitest";
import { resolveBlobToken } from "@/lib/blob-token";

describe("blob token resolution", () => {
  it("prefers the plain name, then a store-prefixed one", () => {
    expect(resolveBlobToken({ BLOB_READ_WRITE_TOKEN: "plain", VO_GOAT_BLOB_READ_WRITE_TOKEN: "prefixed" })).toBe("plain");
    expect(resolveBlobToken({ VO_GOAT_BLOB_READ_WRITE_TOKEN: "prefixed", VO_GOAT_BLOB_STORE_ID: "id" })).toBe("prefixed");
    expect(resolveBlobToken({ SOME_READ_WRITE_TOKEN: "other" })).toBe("other");
    expect(resolveBlobToken({ BLOB_READ_WRITE_TOKEN: "  ", VO_GOAT_BLOB_STORE_ID: "id" })).toBeUndefined();
  });
});

describe("connected-store detection (OIDC-era stores)", () => {
  it("requires Vercel plus a store id", async () => {
    const { hasConnectedBlobStore } = await import("@/lib/blob-token");
    expect(hasConnectedBlobStore({ VERCEL: "1", VO_GOAT_BLOB_STORE_ID: "store_x" })).toBe(true);
    expect(hasConnectedBlobStore({ VERCEL: "1", BLOB_STORE_ID: "store_x" })).toBe(true);
    expect(hasConnectedBlobStore({ VO_GOAT_BLOB_STORE_ID: "store_x" })).toBe(false);
    expect(hasConnectedBlobStore({ VERCEL: "1" })).toBe(false);
  });
});
