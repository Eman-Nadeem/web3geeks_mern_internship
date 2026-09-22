import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { removeOrganizationMember } from "@/server/modules/memberships/service";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const DELETE = withHandler(
  withAuth(
    withOrgRole<{ organizationId: string; membershipId: string }>(
      ["OWNER", "ADMIN"],
      async (_req: NextRequest, ctx: OrgRoleContext<{ organizationId: string; membershipId: string }>) => {
        const params = await Promise.resolve(ctx.params);
        const { organizationId, membershipId } = params;

        await removeOrganizationMember(organizationId, membershipId, {
          userId: ctx.user.id,
          role: ctx.membership.role,
        });

        return successResponse(
          null,
          "Member removed successfully",
          200
        );
      }
    )
  )
);
