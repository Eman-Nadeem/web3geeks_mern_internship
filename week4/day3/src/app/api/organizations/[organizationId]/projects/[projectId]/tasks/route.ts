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
  createTask,
  getProjectTasks,
} from "@/server/modules/tasks/service";
import {
  createTaskSchema,
  getTasksQuerySchema,
} from "@/server/modules/tasks/schemas";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext) => {
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
        });

        const result = await getProjectTasks(
          ctx.project.id,
          ctx.organization.id,
          query
        );

        return successResponse(
          result,
          "Tasks retrieved successfully",
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
        const input = createTaskSchema.parse(body);

        const task = await createTask(
          ctx.project.id,
          ctx.organization.id,
          ctx.user.id,
          ctx.membership.role,
          ctx.isProjectMember,
          input
        );

        return successResponse(
          { task },
          "Task created successfully",
          201
        );
      })
    )
  )
);
