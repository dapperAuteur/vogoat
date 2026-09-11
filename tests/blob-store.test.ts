import { afterEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
vi.mock("@vercel/blob", () => ({
  get: (...args: unknown[]) => getMock(...args),
  put: vi.fn(),
  del: vi.fn(),
}));

// Regression for the 2026-09-10 production outage: @vercel/blob's get() throws unless the call
// states access, and ours did not, so every playback and download answered 503.
describe("vercel blob store reads", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    getMock.mockReset();
  });

  it("declares private access and returns the streamed bytes", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_teststore_token");
    getMock.mockResolvedValue({
      statusCode: 200,
      stream: new Response(new Uint8Array([1, 2, 3])).body,
      headers: new Headers(),
      blob: { contentType: "audio/webm", size: 3 },
    });
    const { getTakeAudioStore } = await import("@/lib/blob-store");
    const bytes = await getTakeAudioStore().get("https://teststore.private.blob.vercel-storage.com/takes/a.webm");
    expect(getMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ access: "private" }));
    expect(Array.from(bytes ?? [])).toEqual([1, 2, 3]);
  });
});
