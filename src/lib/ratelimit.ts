// Simple in-memory sliding window rate limiter (per-process)
// NOTE: For multi-instance deployments, replace with Redis-based limiter.

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetInMs: number;
};

interface Bucket {
  timestamps: number[]; // epoch ms
}

const buckets = new Map<string, Bucket>();

function cleanup(bucket: Bucket, windowMs: number, now: number) {
  // remove entries older than window
  const cutoff = now - windowMs;
  while (bucket.timestamps.length && bucket.timestamps[0] < cutoff) {
    bucket.timestamps.shift();
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  cleanup(bucket, windowMs, now);

  if (bucket.timestamps.length >= limit) {
    const resetInMs = Math.max(0, bucket.timestamps[0] + windowMs - now);
    return { ok: false, remaining: 0, resetInMs };
  }

  bucket.timestamps.push(now);
  const remaining = Math.max(0, limit - bucket.timestamps.length);
  const resetInMs = bucket.timestamps[0] ? bucket.timestamps[0] + windowMs - now : windowMs;
  return { ok: true, remaining, resetInMs };
}

export function keyFromIpAndPath(ip: string | undefined | null, path: string): string {
  const safeIp = ip || 'unknown';
  return `rl:${safeIp}:${path}`;
}
