/**
 * Advanced Rate Limiting with Redis support for serverless environments
 *
 * Features:
 * - Redis-based rate limiting (Upstash) for multi-instance deployments
 * - In-memory fallback for development/testing
 * - Sliding window algorithm
 * - Automatic cleanup of old entries
 *
 * Setup Upstash Redis (optional, recommended for production):
 * 1. Sign up at https://upstash.com (free tier: 10k requests/day)
 * 2. Create Redis database
 * 3. Add to .env:
 *    UPSTASH_REDIS_REST_URL=https://...
 *    UPSTASH_REDIS_REST_TOKEN=...
 */

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetInMs: number;
};

interface Bucket {
  timestamps: number[]; // epoch ms
}

// In-memory fallback (only for development or when Redis is not configured)
const buckets = new Map<string, Bucket>();

// Redis client (lazy loaded)
let redis: any = null;

async function getRedisClient() {
  if (redis !== null) return redis;

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn('[RATELIMIT] Redis not configured, using in-memory fallback (not recommended for production)');
    redis = false; // Mark as unavailable
    return false;
  }

  try {
    // Dynamic import to avoid bundling Redis in all environments
    const { Redis } = await import('@upstash/redis');
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log('[RATELIMIT] Redis connected successfully');
    return redis;
  } catch (error) {
    console.error('[RATELIMIT] Failed to connect to Redis, using in-memory fallback:', error);
    redis = false;
    return false;
  }
}

// Redis-based rate limiting (for production)
async function rateLimitRedis(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = await getRedisClient();
  if (!client) {
    // Fallback to in-memory if Redis is not available
    return rateLimitMemory(key, limit, windowMs);
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  try {
    // Use Redis sorted set with timestamps as scores
    const pipeline = client.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);

    // Count current requests in window
    pipeline.zcard(key);

    // Add current request
    pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

    // Set expiry on key
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = (results[1] as number) || 0;

    if (count >= limit) {
      // Get oldest entry to calculate reset time
      const oldest = await client.zrange(key, 0, 0, { withScores: true });
      const resetInMs = oldest.length > 0
        ? Math.max(0, (oldest[0].score as number) + windowMs - now)
        : windowMs;

      return { ok: false, remaining: 0, resetInMs };
    }

    const remaining = Math.max(0, limit - count - 1);
    return { ok: true, remaining, resetInMs: windowMs };
  } catch (error) {
    console.error('[RATELIMIT] Redis error, falling back to in-memory:', error);
    return rateLimitMemory(key, limit, windowMs);
  }
}

// In-memory rate limiting (fallback)
function rateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }

  // Cleanup old entries
  const cutoff = now - windowMs;
  while (bucket.timestamps.length && bucket.timestamps[0] < cutoff) {
    bucket.timestamps.shift();
  }

  if (bucket.timestamps.length >= limit) {
    const resetInMs = Math.max(0, bucket.timestamps[0] + windowMs - now);
    return { ok: false, remaining: 0, resetInMs };
  }

  bucket.timestamps.push(now);
  const remaining = Math.max(0, limit - bucket.timestamps.length);
  const resetInMs = bucket.timestamps[0] ? bucket.timestamps[0] + windowMs - now : windowMs;
  return { ok: true, remaining, resetInMs };
}

// Main rate limiting function
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const client = await getRedisClient();

  if (client) {
    return rateLimitRedis(key, limit, windowMs);
  } else {
    return rateLimitMemory(key, limit, windowMs);
  }
}

// Helper to create rate limit key from IP and path
export function keyFromIpAndPath(ip: string | undefined | null, path: string): string {
  const safeIp = ip || 'unknown';
  return `rl:${safeIp}:${path}`;
}

// Helper to get client IP from request headers
export function getClientIp(headers: Headers): string | null {
  // Try different headers in order of preference
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Vercel specific header
  const vercelIp = headers.get('x-vercel-forwarded-for');
  if (vercelIp) {
    return vercelIp.split(',')[0].trim();
  }

  return null;
}
