import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole } from "@/server/http/with-org-role";
import {
  withProjectAccess,
  ProjectContext,
} from "@/server/http/with-project-access";
import { successResponse } from "@/server/http/response";
import {
  getProjectMembers,
  addProjectMember,
} from "@/server/modules/projects/service";
import { addProjectMemberSchema } from "@/server/modules/projects/schemas";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (_req: NextRequest, ctx: ProjectContext) => {
        const members = await getProjectMembers(ctx.project.id);

        return successResponse(
          { members },
          "Project members retrieved successfully",
          200
        );
      })
    )
  )
);

export const POST = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext) => {
        const body = await req.json();
        const input = addProjectMemberSchema.parse(body);

        const member = await addProjectMember(
          ctx.project.id,
          ctx.organization.id,
          ctx.user.id,
          ctx.membership.role,
          ctx.isProjectOwner,
          input.userId
        );

        return successResponse(
          { member },
          "Member added to project successfully",
          201
        );
      })
    )
  )
);
