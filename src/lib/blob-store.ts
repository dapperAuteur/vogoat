import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";
import { env, hasBlobStore, isProduction } from "@/lib/env";

/**
 * Where kept take audio lives (invariant 2: only KEPT takes ever reach a store). Vercel Blob
 * with access "private" when provisioned; a local directory in development; tests inject a
 * fake. Playback goes through the owner-checked route, never a raw store URL.
 */
export interface TakeAudioStore {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<string>;
  get(url: string): Promise<Uint8Array | null>;
  delete(url: string): Promise<void>;
}

const LOCAL_PREFIX = "local-blob:";
const localDir = () => process.env.BLOB_LOCAL_DIR ?? "./.data/blobs";

const localStore: TakeAudioStore = {
  async put(key, bytes) {
    await mkdir(localDir(), { recursive: true });
    await writeFile(path.join(localDir(), key), bytes);
    return `${LOCAL_PREFIX}${key}`;
  },
  async get(url) {
    if (!url.startsWith(LOCAL_PREFIX)) return null;
    try {
      return new Uint8Array(await readFile(path.join(localDir(), url.slice(LOCAL_PREFIX.length))));
    } catch {
      return null;
    }
  },
  async delete(url) {
    if (!url.startsWith(LOCAL_PREFIX)) return;
    await rm(path.join(localDir(), url.slice(LOCAL_PREFIX.length)), { force: true });
  },
};

const vercelStore: TakeAudioStore = {
  async put(key, bytes, contentType) {
    const result = await put(`takes/${key}`, Buffer.from(bytes), {
      access: "private",
      contentType,
      addRandomSuffix: true,
      // Omitted token = the SDK resolves env token or Vercel OIDC (new-generation stores).
      ...(env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : {}),
    });
    return result.url;
  },
  async get(url) {
    // v2.8 `get` returns the blob content for private blobs when authorized; older shapes
    // expose only a downloadUrl. Feature-detect rather than assume.
    const result = (await get(url, (env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : {}) as Parameters<typeof get>[1])) as unknown;
    if (!result) return null;
    const r = result as {
      stream?: ReadableStream<Uint8Array> | null;
      arrayBuffer?: () => Promise<ArrayBuffer>;
      blob?: () => Promise<Blob>;
      downloadUrl?: string;
      url?: string;
    };
    if (r.stream) return new Uint8Array(await new Response(r.stream).arrayBuffer());
    if (typeof r.arrayBuffer === "function") return new Uint8Array(await r.arrayBuffer());
    if (typeof r.blob === "function") return new Uint8Array(await (await r.blob()).arrayBuffer());
    const target = r.downloadUrl ?? r.url;
    if (!target) return null;
    const res = await fetch(target, env.BLOB_READ_WRITE_TOKEN ? { headers: { authorization: `Bearer ${env.BLOB_READ_WRITE_TOKEN}` } } : undefined);
    if (!res.ok) return null;
    return new Uint8Array(await res.arrayBuffer());
  },
  async delete(url) {
    await del(url, env.BLOB_READ_WRITE_TOKEN ? { token: env.BLOB_READ_WRITE_TOKEN } : undefined);
  },
};

export function getTakeAudioStore(): TakeAudioStore {
  if (hasBlobStore) return vercelStore;
  if (isProduction) throw new Error("BLOB_READ_WRITE_TOKEN is required in production (task 01)");
  return localStore;
}
