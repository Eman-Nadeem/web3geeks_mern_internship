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
  getTaskDetail,
  updateTask,
  deleteTask,
} from "@/server/modules/tasks/service";
import { updateTaskSchema } from "@/server/modules/tasks/schemas";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(
        async (
          _req: NextRequest,
          ctx: ProjectContext<{
            organizationId: string;
            projectId: string;
            taskId: string;
          }>
        ) => {
          const params = await Promise.resolve(ctx.params);
          const { taskId } = params;

          const task = await getTaskDetail(taskId, ctx.project.id);

          return successResponse(
            { task },
            "Task retrieved successfully",
            200
          );
        }
      )
    )
  )
);

export const PATCH = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(
        async (
          req: NextRequest,
          ctx: ProjectContext<{
            organizationId: string;
            projectId: string;
            taskId: string;
          }>
        ) => {
          const params = await Promise.resolve(ctx.params);
          const { taskId } = params;

          const body = await req.json();
          const input = updateTaskSchema.parse(body);

          const task = await updateTask(
            taskId,
            ctx.project.id,
            ctx.user.id,
            ctx.membership.role,
            ctx.isProjectOwner,
            ctx.isProjectMember,
            input
          );

          return successResponse(
            { task },
            "Task updated successfully",
            200
          );
        }
      )
    )
  )
);

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
            taskId: string;
          }>
        ) => {
          const params = await Promise.resolve(ctx.params);
          const { taskId } = params;

          await deleteTask(
            taskId,
            ctx.project.id,
            ctx.user.id,
            ctx.membership.role,
            ctx.isProjectOwner
          );

          return successResponse(
            null,
            "Task deleted successfully",
            200
          );
        }
      )
    )
  )
);
