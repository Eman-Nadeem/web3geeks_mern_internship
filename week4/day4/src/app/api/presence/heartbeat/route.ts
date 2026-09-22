import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { AuthenticatedContext } from "@/server/http/with-auth";
import { successResponse } from "@/server/http/response";
import { heartbeat } from "@/server/modules/presence/service";
import { AppError } from "@/server/http/AppError";

// Simple in-memory rate limit: 60 heartbeats / minute per user
const heartbeatCounts = new Map<string, { count: number; resetAt: number }>();

function checkHeartbeatLimit(userId: string): void {
  if (process.env.NODE_ENV === "test") return;
  const now = Date.now();
  const window = heartbeatCounts.get(userId);
  if (!window || now > window.resetAt) {
    heartbeatCounts.set(userId, { count: 1, resetAt: now + 60_000 });
    return;
  }
  if (window.count >= 60) {
    throw new AppError(429, "Too many heartbeat requests");
  }
  window.count++;
}

export const POST = withHandler(
  withAuth(async (_req: NextRequest, ctx: AuthenticatedContext) => {
    checkHeartbeatLimit(ctx.user.id);
    await heartbeat(ctx.user.id);
    return successResponse({ userId: ctx.user.id }, "Heartbeat recorded");
  })
);
