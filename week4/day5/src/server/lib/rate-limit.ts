import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { env } from "../config/env";
import { AppError } from "../http/AppError";

// In-memory sliding window rate limiter fallback for dev and test environments
export class MemoryRatelimit {
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

// 10 requests / 15 minutes
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_MAX_REQUESTS = 10;

// 20 invitations / hour per organization
const INVITE_WINDOW_MS = 60 * 60 * 1000;
const INVITE_MAX_REQUESTS = 20;

// 30 token lookups / 15 minutes per IP
const TOKEN_WINDOW_MS = 15 * 60 * 1000;
const TOKEN_MAX_REQUESTS = 30;

let authRatelimiter: { limit(id: string): Promise<{ success: boolean }> } | null = null;
let inviteRatelimiter: { limit(id: string): Promise<{ success: boolean }> } | null = null;
let tokenRatelimiter: { limit(id: string): Promise<{ success: boolean }> } | null = null;

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
    authRatelimiter = new MemoryRatelimit(AUTH_MAX_REQUESTS, AUTH_WINDOW_MS);
  }

  return authRatelimiter;
}

export function getInviteRatelimiter() {
  if (inviteRatelimiter) return inviteRatelimiter;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    inviteRatelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(INVITE_MAX_REQUESTS, "1 h"),
      analytics: true,
      prefix: "@ratelimit/invite",
    });
  } else {
    inviteRatelimiter = new MemoryRatelimit(INVITE_MAX_REQUESTS, INVITE_WINDOW_MS);
  }

  return inviteRatelimiter;
}

export function getTokenRatelimiter() {
  if (tokenRatelimiter) return tokenRatelimiter;

  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
      url: env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    });

    tokenRatelimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(TOKEN_MAX_REQUESTS, "15 m"),
      analytics: true,
      prefix: "@ratelimit/token",
    });
  } else {
    tokenRatelimiter = new MemoryRatelimit(TOKEN_MAX_REQUESTS, TOKEN_WINDOW_MS);
  }

  return tokenRatelimiter;
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

export async function rateLimitOrgInvitations(organizationId: string): Promise<void> {
  if (process.env.NODE_ENV === "test" && process.env.TEST_ENABLE_RATELIMIT !== "true") {
    return;
  }

  const limiter = getInviteRatelimiter();
  const { success } = await limiter.limit(organizationId);

  if (!success) {
    throw new AppError(429, "Too many invitation attempts for this organization. Please try again later.");
  }
}

export async function rateLimitInvitationTokenLookup(req: NextRequest): Promise<void> {
  if (process.env.NODE_ENV === "test" && process.env.TEST_ENABLE_RATELIMIT !== "true") {
    return;
  }

  const ip = getClientIp(req);
  const limiter = getTokenRatelimiter();
  const { success } = await limiter.limit(ip);

  if (!success) {
    throw new AppError(429, "Too many invitation lookup requests. Please try again later.");
  }
}
