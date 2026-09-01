/** Server-action envelope (shared conventions): never throw to a client component. */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err<T = never>(code: string, error: string): ActionResult<T> {
  return { ok: false, error, code };
}
