import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { successResponse } from "@/server/http/response";
import { getMyTasks } from "@/server/modules/tasks/service";
import { getTasksQuerySchema } from "@/server/modules/tasks/schemas";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN", "MEMBER"], async (req: NextRequest, ctx: OrgRoleContext) => {
      const url = new URL(req.url);
      const query = getTasksQuerySchema.parse({
        search: url.searchParams.get("search") || undefined,
        status: url.searchParams.get("status") || undefined,
        priority: url.searchParams.get("priority") || undefined,
        assigneeId: url.searchParams.get("assigneeId") || undefined,
        dueBefore: url.searchParams.get("dueBefore") || undefined,
        dueAfter: url.searchParams.get("dueAfter") || undefined,
        overdue: url.searchParams.get("overdue") || undefined,
        sort: url.searchParams.get("sort") || undefined,
        page: url.searchParams.get("page") || undefined,
        limit: url.searchParams.get("limit") || undefined,
        projectId: url.searchParams.get("projectId") || undefined,
      });

      const result = await getMyTasks(
        ctx.organization.id,
        ctx.user.id,
        ctx.membership.role,
        query
      );

      return successResponse(
        result,
        "Organization tasks retrieved successfully",
        200
      );
    })
  )
);
