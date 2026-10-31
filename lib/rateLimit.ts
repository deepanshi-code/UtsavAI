/**
 * Best-effort per-instance rate limit. Serverless instances don't share memory,
 * so this only blunts bursts; a shared store (e.g. Upstash) would be needed for a hard cap.
 */
export function createLimiter(max: number, windowMs = 60_000, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return function limited(key: string): boolean {
    const t = now();
    // Keep memory bounded if many distinct clients pass through one instance.
    if (hits.size > 5_000) hits.clear();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    recent.push(t);
    hits.set(key, recent);
    return recent.length > max;
  };
}

/** The caller's IP as reported by the platform's proxy, or "local" in development. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
