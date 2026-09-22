import { NextRequest, NextResponse } from "next/server";
import { withHandler, NextRouteContext } from "@/server/http/with-handler";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { verifyToken } from "@/server/lib/jwt";
import { prisma } from "@/server/db/prisma";
import { AppError } from "@/server/http/AppError";
import { hashToken, acceptInvitation } from "@/server/modules/invitations/service";
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

export const POST = withHandler(
  async (req: NextRequest, rawContext: NextRouteContext<{ token: string }>) => {
    await rateLimitInvitationTokenLookup(req);

    const params = await Promise.resolve(rawContext.params);
    const { token } = params;

    const currentUser = await getOptionalUser(req);

    if (!currentUser) {
      // Lookup invitation to return email for login/registration prefill
      const tokenHash = hashToken(token);
      const invitation = await prisma.invitation.findUnique({
        where: { token: tokenHash },
      });

      if (!invitation) {
        throw AppError.notFound("Invitation not found");
      }

      if (invitation.status === "ACCEPTED" || invitation.status === "CANCELLED") {
        throw AppError.conflict("Invitation already used");
      }

      if (invitation.status === "EXPIRED" || new Date(invitation.expiresAt).getTime() < Date.now()) {
        if (invitation.status !== "EXPIRED") {
          await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: "EXPIRED" },
          });
        }
        throw new AppError(410, "Invitation has expired");
      }

      return NextResponse.json(
        {
          success: false,
          message: "Authentication required to accept invitation",
          data: {
            requiresAuth: true,
            email: invitation.email,
          },
        },
        { status: 401 }
      );
    }

    const result = await acceptInvitation(token, currentUser);

    return successResponse(
      result,
      "Invitation accepted successfully",
      200
    );
  }
);
