/**
 * MP3 encoding for kept takes (BAM, 2026-09-12). Browsers cannot record MP3: MediaRecorder gives
 * webm/Opus on Chrome and Firefox and mp4/AAC on Safari. So the recording is converted on the
 * device at Keep time, and the one Keep upload carries an MP3 that plays anywhere.
 *
 * Pure and DOM-free so it runs under Vitest; the browser decode lives in ./to-mp3.
 */

/** 44.1 kHz mono at 128 kbps: clean for voice, about 1 MB a minute (a 30s take is ~480 KB). */
export const MP3_SAMPLE_RATE = 44_100;
export const MP3_KBPS = 128;

const SAMPLES_PER_FRAME = 1152;
// Hand control back to the page every ~6.7s of audio so a phone's UI never freezes mid-encode.
const FRAMES_PER_YIELD = 256;

export function floatTo16BitPcm(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Encodes mono float samples to an `audio/mpeg` Blob. The encoder loads on first use only. */
export async function encodeMp3(samples: Float32Array, sampleRate: number = MP3_SAMPLE_RATE, kbps: number = MP3_KBPS): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const pcm = floatTo16BitPcm(samples);
  const parts: Uint8Array<ArrayBuffer>[] = [];
  for (let offset = 0, frame = 1; offset < pcm.length; offset += SAMPLES_PER_FRAME, frame++) {
    const chunk = encoder.encodeBuffer(pcm.subarray(offset, offset + SAMPLES_PER_FRAME));
    // Copied: the encoder may reuse its output buffer between calls.
    if (chunk.length > 0) parts.push(new Uint8Array(chunk));
    if (frame % FRAMES_PER_YIELD === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const tail = encoder.flush();
  if (tail.length > 0) parts.push(new Uint8Array(tail));
  return new Blob(parts, { type: "audio/mpeg" });
}
