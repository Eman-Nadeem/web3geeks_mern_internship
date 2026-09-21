import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { env } from "../config/env";
import { AppError } from "../http/AppError";

// In-memory sliding window rate limiter fallback for dev and test environments
class MemoryRatelimit {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async limit(identifier: string): Promise<{ success: boolean; reset: number; remaining: number }> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = (this.requests.get(identifier) || []).filter((t) => t > windowStart);

    if (timestamps.length >= this.maxRequests) {
      const oldest = timestamps[0];
      const reset = oldest + this.windowMs;
      return { success: false, reset, remaining: 0 };
    }

    timestamps.push(now);
    this.requests.set(identifier, timestamps);
    return {
      success: true,
      reset: now + this.windowMs,
      remaining: this.maxRequests - timestamps.length,
    };
  }

  reset(): void {
    this.requests.clear();
  }
}

// 10 requests / 15 minutes = 15 * 60 * 1000 ms
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 10;

let authRatelimiter:
  | { limit(id: string): Promise<{ success: boolean }> }
  | null = null;

export function getAuthRatelimiter() {
  if (authRatelimiter) return authRatelimiter;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    authRatelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(AUTH_MAX_REQUESTS, "15 m"),
      analytics: true,
      prefix: "@ratelimit/auth",
    });
  } else {
    // Development/Test fallback
    authRatelimiter = new MemoryRatelimit(AUTH_MAX_REQUESTS, AUTH_WINDOW_MS);
  }

  return authRatelimiter;
}

export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

export async function rateLimitAuth(req: NextRequest): Promise<void> {
  // In test environment, bypass rate limit unless explicitly testing it
  if (process.env.NODE_ENV === "test" && process.env.TEST_ENABLE_RATELIMIT !== "true") {
    return;
  }

  const ip = getClientIp(req);
  const limiter = getAuthRatelimiter();
  const { success } = await limiter.limit(ip);

  if (!success) {
    throw new AppError(429, "Too many attempts. Please try again in 15 minutes.");
  }
}
