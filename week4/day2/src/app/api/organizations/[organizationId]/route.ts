import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { validate } from "@/server/http/validate";
import { updateOrgSchema } from "@/lib/validations";
import {
  getOrganizationDetail,
  updateOrganization,
  deleteOrganization,
} from "@/server/modules/organizations/service";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN", "MEMBER"], async (_req: NextRequest, ctx: OrgRoleContext) => {
      const organization = await getOrganizationDetail(
        ctx.organization.id,
        ctx.membership.role
      );
      return successResponse(
        { organization },
        "Organization details retrieved successfully",
        200
      );
    })
  )
);

export const PATCH = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN"], async (req: NextRequest, ctx: OrgRoleContext) => {
      const rawBody = await req.json();
      const input = validate(updateOrgSchema, rawBody);

      const organization = await updateOrganization(
        ctx.organization.id,
        input,
        ctx.membership.role
      );

      return successResponse(
        { organization },
        "Organization updated successfully",
        200
      );
    })
  )
);

export const DELETE = withHandler(
  withAuth(
    withOrgRole(["OWNER"], async (_req: NextRequest, ctx: OrgRoleContext) => {
      const deletedOrg = await deleteOrganization(ctx.organization.id);

      return successResponse(
        { organization: deletedOrg },
        "Organization deleted successfully",
        200
      );
    })
  )
);
