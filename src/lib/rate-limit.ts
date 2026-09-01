// Best-effort, per-instance rate limiting (PRD §11): serverless instances do not share
// memory, so this caps abuse per instance only. Back with Upstash/KV if real pressure shows.
const hits = new Map<string, { count: number; reset: number }>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || now > rec.reset) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    }
    return false;
  }
  rec.count += 1;
  return rec.count > max;
}

/** Test hook. */
export function resetRateLimits(): void {
  hits.clear();
}
