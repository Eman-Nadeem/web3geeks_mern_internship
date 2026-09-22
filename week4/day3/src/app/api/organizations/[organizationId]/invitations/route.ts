import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { validate } from "@/server/http/validate";
import { createInvitationSchema } from "@/server/modules/invitations/schemas";
import {
  createInvitation,
  getOrganizationInvitations,
} from "@/server/modules/invitations/service";
import { rateLimitOrgInvitations } from "@/server/lib/rate-limit";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN"], async (_req: NextRequest, ctx: OrgRoleContext) => {
      const invitations = await getOrganizationInvitations(ctx.organization.id);

      return successResponse(
        { invitations },
        "Invitations retrieved successfully",
        200
      );
    })
  )
);

export const POST = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN"], async (req: NextRequest, ctx: OrgRoleContext) => {
      await rateLimitOrgInvitations(ctx.organization.id);

      const rawBody = await req.json();
      const input = validate(createInvitationSchema, rawBody);

      const invitation = await createInvitation(
        ctx.organization.id,
        {
          userId: ctx.user.id,
          role: ctx.membership.role,
        },
        input
      );

      return successResponse(
        invitation,
        "Invitation sent successfully",
        201
      );
    })
  )
);
