import type { Instrumentation } from "next";

/**
 * Next.js server-error hook: every uncaught server error (RSC, route handler, server action)
 * lands in error_log with the same digest the user's error screen shows, so /admin/errors can
 * answer "how and why did it fail". Persisting is best-effort; the console always logs.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest?: string }).digest ?? "") : "";
  const message = error instanceof Error ? `${error.constructor.name}: ${error.message}` : "unknown error";
  console.error(`[server-error] ${request.method} ${request.path} digest=${digest} ${message}`);
  try {
    const { getDb } = await import("@/db/client");
    const { logAppError } = await import("@/lib/errors/log");
    const db = await getDb();
    await logAppError(db, { source: "server", message, digest: digest || null, path: request.path });
  } catch {
    // The database itself may be the failing dependency; the console line above stands.
  }
};
