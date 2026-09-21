import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { getOrganizationMembers } from "@/server/modules/memberships/service";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN", "MEMBER"], async (_req: NextRequest, ctx: OrgRoleContext) => {
      const members = await getOrganizationMembers(ctx.organization.id);
      return successResponse(
        { members },
        "Organization members retrieved successfully",
        200
      );
    })
  )
);
