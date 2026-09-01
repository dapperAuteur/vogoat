"use client";

import { useEffect, useRef, useState } from "react";

const MAX_MS = 30_000;

/**
 * The practice room's recorder: entirely local (nothing registers, nothing uploads yet;
 * saved practice takes are the fast-follow). Same mic etiquette as the daily.
 */
export function PracticeRecorder() {
  const [phase, setPhase] = useState<"idle" | "starting" | "recording" | "review">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    setError(null);
    setPhase("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setUrl(URL.createObjectURL(blob));
        setPhase("review");
        if (timerRef.current) clearInterval(timerRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      recorder.start(250);
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_MS && recorderRef.current?.state === "recording") recorderRef.current.stop();
      }, 200);
      setPhase("recording");
    } catch {
      setPhase("idle");
      setError("Microphone access was blocked; allow it in the address bar and try again.");
    }
  }

  const seconds = Math.min(Math.floor(elapsedMs / 1000), 30);

  if (phase === "review" && url) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-rule bg-card p-4">
        {/* The recipe on this page is the transcript prompt; nothing here uploads. */}
        <audio controls src={url} className="w-full" />
        <button
          type="button"
          onClick={() => {
            URL.revokeObjectURL(url);
            setUrl(null);
            setPhase("idle");
          }}
          className="min-h-12 rounded-md border border-ink font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Again (stays on this device)
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={phase === "recording" ? () => recorderRef.current?.stop() : start}
        disabled={phase === "starting"}
        className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-md font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60 ${
          phase === "recording" ? "bg-ochre text-card" : "bg-moss text-on-moss"
        }`}
      >
        {phase === "recording" ? `Stop · 0:${String(seconds).padStart(2, "0")} of 0:30` : phase === "starting" ? "Starting…" : "Record (practice, never counted)"}
      </button>
      {error ? (
        <p role="alert" className="text-center text-xs text-ochre">
          {error}
        </p>
      ) : null}
      <p className="text-center text-xs leading-relaxed text-muted">
        Practice never touches the daily and never uploads; saved practice takes are coming.
      </p>
    </div>
  );
}
