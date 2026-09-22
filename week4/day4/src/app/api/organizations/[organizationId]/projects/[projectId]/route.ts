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
  getProjectDetail,
  updateProject,
  deleteProject,
} from "@/server/modules/projects/service";
import { updateProjectSchema } from "@/server/modules/projects/schemas";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (_req: NextRequest, ctx: ProjectContext) => {
        const project = await getProjectDetail(
          ctx.project.id,
          ctx.organization.id,
          ctx.user.id,
          ctx.membership.role
        );

        return successResponse(
          { project },
          "Project retrieved successfully",
          200
        );
      })
    )
  )
);

export const PATCH = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext) => {
        const body = await req.json();
        const input = updateProjectSchema.parse(body);

        const project = await updateProject(
          ctx.project.id,
          ctx.organization.id,
          ctx.membership.role,
          ctx.isProjectOwner,
          input
        );

        return successResponse(
          { project },
          "Project updated successfully",
          200
        );
      })
    )
  )
);

export const DELETE = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (_req: NextRequest, ctx: ProjectContext) => {
        await deleteProject(ctx.project.id, ctx.membership.role);

        return successResponse(
          null,
          "Project deleted successfully",
          200
        );
      })
    )
  )
);
