import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { cancelInvitation } from "@/server/modules/invitations/service";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const DELETE = withHandler(
  withAuth(
    withOrgRole<{ organizationId: string; invitationId: string }>(
      ["OWNER", "ADMIN"],
      async (_req: NextRequest, ctx: OrgRoleContext<{ organizationId: string; invitationId: string }>) => {
        const params = await Promise.resolve(ctx.params);
        const { organizationId, invitationId } = params;

        await cancelInvitation(organizationId, invitationId, {
          userId: ctx.user.id,
          role: ctx.membership.role,
        });

        return successResponse(
          null,
          "Invitation cancelled successfully",
          200
        );
      }
    )
  )
);
