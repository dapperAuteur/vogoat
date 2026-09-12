import { encodeMp3, MP3_SAMPLE_RATE } from "./mp3";

export type ConvertedRecording = { file: Blob; format: "mp3" | "original" };

type OfflineContextConstructor = typeof OfflineAudioContext;

/**
 * Turns a MediaRecorder blob into an MP3, entirely on this device: decode, mix to mono, encode.
 *
 * Any failure (an old browser with no OfflineAudioContext, a recording the decoder refuses)
 * returns the original recording instead, so keeping a take never fails because of the
 * conversion. The server accepts both, and downloads are named by the stored type.
 */
export async function convertRecordingToMp3(recording: Blob): Promise<ConvertedRecording> {
  if (recording.type.startsWith("audio/mpeg")) return { file: recording, format: "mp3" };
  try {
    const Context: OfflineContextConstructor | undefined =
      window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: OfflineContextConstructor }).webkitOfflineAudioContext;
    if (!Context) return { file: recording, format: "original" };
    // decodeAudioData resamples to the context's rate, so a one-sample context is enough to decode.
    const decoded = await new Context(1, 1, MP3_SAMPLE_RATE).decodeAudioData(await recording.arrayBuffer());
    const mono = new Float32Array(decoded.length);
    for (let c = 0; c < decoded.numberOfChannels; c++) {
      const channel = decoded.getChannelData(c);
      for (let i = 0; i < channel.length; i++) mono[i] += channel[i] / decoded.numberOfChannels;
    }
    const file = await encodeMp3(mono, decoded.sampleRate);
    return file.size > 0 ? { file, format: "mp3" } : { file: recording, format: "original" };
  } catch {
    return { file: recording, format: "original" };
  }
}
