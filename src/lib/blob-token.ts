/**
 * Vercel injects the Blob store's token under a store-derived prefix (BAM's store produced
 * VO_GOAT_BLOB_* names), while docs and older setups use plain BLOB_READ_WRITE_TOKEN. Resolve
 * whichever exists so the dashboard's naming never breaks audio (same lesson as the STORAGE_
 * Neon prefixes). Pure so it is testable.
 */
export function resolveBlobToken(environment: Record<string, string | undefined>): string | undefined {
  const direct = environment.BLOB_READ_WRITE_TOKEN?.trim();
  if (direct) return direct;
  const prefixed = Object.keys(environment)
    .filter((key) => key.endsWith("_READ_WRITE_TOKEN") && environment[key]?.trim())
    .sort();
  const blobNamed = prefixed.find((key) => key.includes("BLOB"));
  const chosen = blobNamed ?? prefixed[0];
  return chosen ? environment[chosen]?.trim() : undefined;
}

/**
 * New-generation Blob stores (2026) inject only <PREFIX>_BLOB_STORE_ID + a webhook key and
 * authenticate via Vercel OIDC instead of a read-write token (observed on BAM's project,
 * 2026-09-02). A connected store on Vercel counts as configured even with no token.
 */
export function hasConnectedBlobStore(environment: Record<string, string | undefined>): boolean {
  if (!environment.VERCEL) return false;
  return Object.keys(environment).some((key) => (key === "BLOB_STORE_ID" || key.endsWith("_BLOB_STORE_ID")) && environment[key]?.trim());
}
