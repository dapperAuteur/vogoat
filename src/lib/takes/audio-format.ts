const EXTENSIONS: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/webm": "webm",
};

/**
 * Download file extension for a stored take, named by what the file really is. New takes are MP3
 * (converted on the device at Keep); older takes and browsers that could not convert keep their
 * recorded format until the 30-day deletion. Rows with no type predate the column: webm.
 */
export function audioFileExtension(mime: string | null | undefined): string {
  const base = (mime ?? "").split(";")[0].trim().toLowerCase();
  return EXTENSIONS[base] ?? "webm";
}
