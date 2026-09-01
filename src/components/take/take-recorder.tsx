"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { keepTakeAction, registerTakeAction } from "@/app/actions/takes";

const MAX_MS = 30_000;

type Phase = "idle" | "starting" | "recording" | "review" | "saving";

type Props = {
  dailyId: string;
  isSignedIn: boolean;
  /** Server-registered attempts so far (signed-in only). */
  attemptCount: number;
  /** Attempt cap for the plan; null = unlimited. */
  limit: number | null;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

/**
 * Recording is local; audio is uploaded ONLY when the user keeps a take (invariant 2).
 * Signed-in attempts are registered at record-start, which is how the 3/day cap is enforced;
 * anonymous rehearsal never touches the server.
 */
export function TakeRecorder({ dailyId, isSignedIn, attemptCount, limit }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ url: string; blob: Blob; durationMs: number; takeId: string | null } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef(0);
  const takeIdRef = useRef<string | null>(null);

  const capped = isSignedIn && limit !== null && attemptCount >= limit;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (review) URL.revokeObjectURL(review.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanupStream() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  async function start() {
    setError(null);
    setPhase("starting");
    takeIdRef.current = null;
    if (isSignedIn) {
      const registered = await registerTakeAction(dailyId);
      if (!registered.ok) {
        setError(registered.error);
        setPhase("idle");
        router.refresh();
        return;
      }
      takeIdRef.current = registered.data.takeId;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const durationMs = Math.min(Date.now() - startedAtRef.current, MAX_MS);
        setReview({ url: URL.createObjectURL(blob), blob, durationMs, takeId: takeIdRef.current });
        setPhase("review");
        cleanupStream();
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
    } catch (cause: unknown) {
      cleanupStream();
      setPhase("idle");
      const denied = cause instanceof DOMException && (cause.name === "NotAllowedError" || cause.name === "PermissionDeniedError");
      setError(
        denied
          ? "Microphone access was blocked. Allow the mic for this site in your browser's address-bar settings, then try again."
          : "Could not start the microphone on this device.",
      );
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function discardLocal() {
    if (review) URL.revokeObjectURL(review.url);
    setReview(null);
    setPhase("idle");
    // The attempt stays counted (PRD: counts are server-tracked; audio never left the device).
    router.refresh();
  }

  async function keep() {
    if (!review || !review.takeId) return;
    setPhase("saving");
    const form = new FormData();
    form.set("takeId", review.takeId);
    form.set("durationMs", String(Math.round(review.durationMs)));
    form.set("audio", new File([review.blob], "take", { type: review.blob.type || "audio/webm" }));
    const result = await keepTakeAction(form);
    if (!result.ok) {
      setError(result.error);
      setPhase("review");
      return;
    }
    URL.revokeObjectURL(review.url);
    setReview(null);
    setPhase("idle");
    router.refresh();
  }

  const seconds = Math.min(Math.floor(elapsedMs / 1000), 30);
  const nextTakeLabel = isSignedIn
    ? limit !== null
      ? `Take ${Math.min(attemptCount + 1, limit)} of ${limit}`
      : `Take ${attemptCount + 1}`
    : "Rehearsal (not counted)";

  if (phase === "review" && review) {
    return (
      <div className="flex flex-col gap-2 rounded-md border border-rule bg-card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
            Specimen call · {(review.durationMs / 1000).toFixed(1)}s
          </span>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- the script text on this page is the transcript */}
        <audio controls src={review.url} className="w-full" />
        <p className="text-xs leading-relaxed text-muted">
          That is the character, not you. Nobody hears it unless you keep it.
        </p>
        {error ? (
          <p role="alert" className="text-xs text-ochre">
            {error}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          {isSignedIn ? (
            <button
              type="button"
              onClick={keep}
              disabled={phase !== "review"}
              className="min-h-12 rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-50"
            >
              Keep this take
            </button>
          ) : (
            <Link
              href="/sign-in"
              className="flex min-h-12 items-center justify-center rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              Sign in to keep takes
            </Link>
          )}
          <button
            type="button"
            onClick={discardLocal}
            className="min-h-12 rounded-md border border-ink font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            Discard (deletes from this device)
          </button>
        </div>
      </div>
    );
  }

  if (phase === "recording" || phase === "saving") {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={stop}
          disabled={phase === "saving"}
          className="flex min-h-14 w-full items-center justify-center gap-3 rounded-md bg-ochre font-semibold text-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
        >
          <span aria-hidden="true" className="h-3 w-3 rounded-xs bg-card" />
          {phase === "saving" ? "Saving…" : `Stop · 0:${String(seconds).padStart(2, "0")} of 0:30`}
        </button>
        <p role="status" className="text-center text-xs text-muted">
          Recording on your device. Nothing uploads unless you keep it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={phase === "starting" || capped}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-md bg-moss font-semibold text-on-moss focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:opacity-60"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v3" />
        </svg>
        {phase === "starting" ? "Starting…" : capped ? "All takes used today" : `Record a take · ${nextTakeLabel}`}
      </button>
      {error ? (
        <p role="alert" className="text-center text-xs text-ochre">
          {error}
        </p>
      ) : null}
      <p className="text-center text-xs leading-relaxed text-muted">
        {capped
          ? "Tomorrow is a new recipe. Submitting one of your kept takes still works today."
          : "We ask for your mic when you tap. Audio stays on your device until you keep a take."}
        {isSignedIn && limit !== null && !capped ? " Starting a recording uses one of today's takes." : ""}
      </p>
    </div>
  );
}
