"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { savePracticeTakeAction } from "@/app/actions/practice";

const MAX_MS = 30_000;

/**
 * The practice room's recorder: entirely local (nothing registers, nothing uploads yet;
 * saved practice takes are the fast-follow). Same mic etiquette as the daily.
 */
export function PracticeRecorder({ recipeId, canSave }: { recipeId: number; canSave: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "starting" | "recording" | "review">("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const startedMsRef = useRef(0);
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
        const recorded = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setBlob(recorded);
        startedMsRef.current = Math.min(Date.now() - startedAtRef.current, MAX_MS);
        setUrl(URL.createObjectURL(recorded));
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
        {canSave ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (!blob) return;
              setSaving(true);
              setError(null);
              const form = new FormData();
              form.set("recipeId", String(recipeId));
              form.set("durationMs", String(Math.round(startedMsRef.current)));
              form.set("audio", new File([blob], "practice", { type: blob.type || "audio/webm" }));
              void savePracticeTakeAction(form).then((result) => {
                setSaving(false);
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                URL.revokeObjectURL(url);
                setUrl(null);
                setBlob(null);
                setPhase("idle");
                router.refresh();
              });
            }}
            className="min-h-12 rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save this practice take"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            URL.revokeObjectURL(url);
            setUrl(null);
            setBlob(null);
            setPhase("idle");
          }}
          className="min-h-12 rounded-md border border-ink font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          Again (stays on this device)
        </button>
        {error ? (
          <p role="alert" className="text-xs text-ochre">
            {error}
          </p>
        ) : null}
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
        Practice never touches the daily. Nothing leaves this device unless you save it.
      </p>
    </div>
  );
}
