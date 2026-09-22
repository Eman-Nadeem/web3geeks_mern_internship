import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { getOrganizationMembers } from "@/server/modules/memberships/service";
import { getMembersQuerySchema } from "@/server/modules/memberships/schemas";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN", "MEMBER"], async (req: NextRequest, ctx: OrgRoleContext) => {
      const url = new URL(req.url);
      const searchParam = url.searchParams.get("search") || undefined;
      const roleParam = url.searchParams.get("role") || undefined;

      const query = getMembersQuerySchema.parse({
        search: searchParam,
        role: roleParam,
      });

      const members = await getOrganizationMembers(ctx.organization.id, query);

      return successResponse(
        { members },
        "Organization members retrieved successfully",
        200
      );
    })
  )
);
