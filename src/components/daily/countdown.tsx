"use client";

import { useEffect, useState } from "react";

function remainingText(deadlineMs: number): string {
  const ms = deadlineMs - Date.now();
  if (ms <= 0) return "now; refresh for the new one";
  const totalMinutes = Math.floor(ms / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `in ${h}h ${m}m` : m > 0 ? `in ${m}m` : "in under a minute";
}

/** Client-only relative time so the server HTML never mismatches on hydration. */
export function Countdown({ deadlineMs }: { deadlineMs: number }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => setText(remainingText(deadlineMs));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [deadlineMs]);
  return <span>{text ? ` ${text}` : ""}</span>;
}
