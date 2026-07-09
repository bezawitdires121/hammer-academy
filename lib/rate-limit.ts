import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Real distributed rate limiting — works correctly across Vercel's separate
// serverless instances, unlike the old in-memory Map version which reset
// per-instance and didn't share state.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const loginRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "5 m"), // 5 attempts per 5 minutes
  prefix: "login-attempt",
});

export async function checkLoginRateLimit(identifier: string): Promise<boolean> {
  const { success } = await loginRateLimiter.limit(identifier);
  return success;
}