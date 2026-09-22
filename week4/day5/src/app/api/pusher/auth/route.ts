import { NextRequest, NextResponse } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { AuthenticatedContext } from "@/server/http/with-auth";
import { AppError } from "@/server/http/AppError";
import { env } from "@/server/config/env";
import { prisma } from "@/server/db/prisma";

/**
 * Pusher channel authentication.
 * Validates that the authenticated user has access to the requested channel.
 *
 * Channel naming convention:
 *   private-user-{userId}          → user owns the channel
 *   private-org-{organizationId}   → user must be an org member
 *   private-project-{projectId}    → user must have project access
 */
export const POST = withHandler(
  withAuth(async (req: NextRequest, ctx: AuthenticatedContext) => {
    const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = env;

    if (!PUSHER_APP_ID || !PUSHER_KEY || !PUSHER_SECRET || !PUSHER_CLUSTER) {
      throw new AppError(503, "Real-time features are not configured");
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      throw new AppError(400, "Missing socket_id or channel_name");
    }

    // Verify channel access
    await verifyChannelAccess(channelName, ctx.user.id);

    const isPresence = channelName.startsWith("presence-");
    let channelData: string | undefined;

    if (isPresence) {
      channelData = JSON.stringify({
        user_id: ctx.user.id,
        user_info: {
          name: ctx.user.name,
          email: ctx.user.email,
        },
      });
    }

    // Sign the channel auth using Pusher's HMAC-SHA256 scheme
    const stringToSign = isPresence
      ? `${socketId}:${channelName}:${channelData}`
      : `${socketId}:${channelName}`;

    const crypto = await import("crypto");
    const signature = crypto
      .createHmac("sha256", PUSHER_SECRET)
      .update(stringToSign)
      .digest("hex");

    const responsePayload: Record<string, string> = {
      auth: `${PUSHER_KEY}:${signature}`,
    };

    if (channelData) {
      responsePayload.channel_data = channelData;
    }

    return NextResponse.json(responsePayload);
  })
);

async function verifyChannelAccess(channelName: string, userId: string): Promise<void> {
  // private-user-{userId}
  if (channelName.startsWith("private-user-")) {
    const channelUserId = channelName.replace("private-user-", "");
    if (channelUserId !== userId) {
      throw new AppError(403, "Access denied to this channel");
    }
    return;
  }

  // private-org-{orgId} or presence-org-{orgId}
  if (channelName.startsWith("private-org-") || channelName.startsWith("presence-org-")) {
    const orgId = channelName.replace(/^(private|presence)-org-/, "");
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: orgId },
    });
    if (!membership) {
      throw new AppError(403, "Access denied to this channel");
    }
    return;
  }

  // private-project-{projectId}
  if (channelName.startsWith("private-project-")) {
    const projectId = channelName.replace("private-project-", "");
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true, ownerId: true },
    });

    if (!project) {
      throw new AppError(403, "Access denied to this channel");
    }

    // Check org membership first (OWNER/ADMIN get access to all projects)
    const membership = await prisma.membership.findFirst({
      where: { userId, organizationId: project.organizationId },
    });

    if (!membership) {
      throw new AppError(403, "Access denied to this channel");
    }

    if (membership.role === "OWNER" || membership.role === "ADMIN") return;
    if (project.ownerId === userId) return;

    // Check direct project membership
    const projectMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!projectMember) {
      throw new AppError(403, "Access denied to this channel");
    }
    return;
  }

  throw new AppError(400, "Unknown channel type");
}
