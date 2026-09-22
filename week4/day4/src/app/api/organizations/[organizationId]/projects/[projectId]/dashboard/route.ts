import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole } from "@/server/http/with-org-role";
import {
  withProjectAccess,
  ProjectContext,
} from "@/server/http/with-project-access";
import { successResponse } from "@/server/http/response";
import { getProjectDashboard } from "@/server/modules/tasks/service";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (_req: NextRequest, ctx: ProjectContext) => {
        const dashboard = await getProjectDashboard(
          ctx.project.id
        );

        return successResponse(
          { dashboard },
          "Project dashboard retrieved successfully",
          200
        );
      })
    )
  )
);
