import { describe, expect, it } from "vitest";
import { encodeMp3, floatTo16BitPcm, MP3_KBPS, MP3_SAMPLE_RATE } from "@/lib/audio/mp3";
import { audioFileExtension } from "@/lib/takes/audio-format";

function sine(seconds: number, hz = 440): Float32Array {
  const out = new Float32Array(Math.round(seconds * MP3_SAMPLE_RATE));
  for (let i = 0; i < out.length; i++) out[i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / MP3_SAMPLE_RATE);
  return out;
}

describe("floatTo16BitPcm", () => {
  it("scales and clamps to the 16-bit range", () => {
    expect(Array.from(floatTo16BitPcm(new Float32Array([0, 1, -1, 2, -2, 0.5])))).toEqual([0, 32767, -32768, 32767, -32768, 16383]);
  });
});

describe("encodeMp3", () => {
  it("produces a real MP3 stream at about the target bitrate", async () => {
    const blob = await encodeMp3(sine(2));
    expect(blob.type).toBe("audio/mpeg");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    // MPEG audio frame sync: 11 set bits at the very start (no ID3 tag is written).
    expect(bytes[0]).toBe(0xff);
    expect(bytes[1] & 0xe0).toBe(0xe0);
    const expected = (2 * MP3_KBPS * 1000) / 8;
    expect(bytes.byteLength).toBeGreaterThan(expected * 0.8);
    expect(bytes.byteLength).toBeLessThan(expected * 1.2);
  });

  it("keeps a full 30-second take far under the upload cap", async () => {
    const blob = await encodeMp3(sine(30));
    expect(blob.size).toBeLessThan(600_000);
  });
});

describe("audioFileExtension", () => {
  it.each([
    ["audio/mpeg", "mp3"],
    ["audio/mp4", "m4a"],
    ["audio/webm;codecs=opus", "webm"],
    ["audio/ogg", "ogg"],
    [null, "webm"],
    ["application/octet-stream", "webm"],
  ])("%s downloads as .%s", (mime, ext) => {
    expect(audioFileExtension(mime)).toBe(ext);
  });
});
