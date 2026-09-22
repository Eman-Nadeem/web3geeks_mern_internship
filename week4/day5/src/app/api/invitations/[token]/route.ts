import { NextRequest } from "next/server";
import { withHandler, NextRouteContext } from "@/server/http/with-handler";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { verifyToken } from "@/server/lib/jwt";
import { prisma } from "@/server/db/prisma";
import { getInvitationByToken } from "@/server/modules/invitations/service";
import { rateLimitInvitationTokenLookup } from "@/server/lib/rate-limit";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

async function getOptionalUser(req: NextRequest): Promise<{ id: string; email: string; name: string } | null> {
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || !payload.sub) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, name: true, email: true },
  });
  return user;
}

export const GET = withHandler(
  async (req: NextRequest, rawContext: NextRouteContext<{ token: string }>) => {
    await rateLimitInvitationTokenLookup(req);

    const params = await Promise.resolve(rawContext.params);
    const { token } = params;

    const currentUser = await getOptionalUser(req);
    const invitation = await getInvitationByToken(token, currentUser);

    return successResponse(
      invitation,
      "Invitation details retrieved successfully",
      200
    );
  }
);
