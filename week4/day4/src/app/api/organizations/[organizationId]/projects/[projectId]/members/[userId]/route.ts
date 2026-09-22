import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole } from "@/server/http/with-org-role";
import {
  withProjectAccess,
  ProjectContext,
} from "@/server/http/with-project-access";
import { successResponse } from "@/server/http/response";
import { removeProjectMember } from "@/server/modules/projects/service";

export const runtime = "nodejs";

export const DELETE = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(
        async (
          _req: NextRequest,
          ctx: ProjectContext<{
            organizationId: string;
            projectId: string;
            userId: string;
          }>
        ) => {
          const params = await Promise.resolve(ctx.params);
          const { userId } = params;

          await removeProjectMember(
            ctx.project.id,
            ctx.organization.id,
            ctx.membership.role,
            ctx.isProjectOwner,
            userId
          );

          return successResponse(
            null,
            "Member removed from project successfully",
            200
          );
        }
      )
    )
  )
);
