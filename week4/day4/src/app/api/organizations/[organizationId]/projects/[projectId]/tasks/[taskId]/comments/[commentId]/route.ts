import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole } from "@/server/http/with-org-role";
import { withProjectAccess, ProjectContext } from "@/server/http/with-project-access";
import { successResponse } from "@/server/http/response";
import { validate } from "@/server/http/validate";
import { UpdateCommentSchema } from "@/server/modules/comments/schemas";
import { updateComment, deleteComment } from "@/server/modules/comments/service";

type Params = {
  organizationId: string;
  projectId: string;
  taskId: string;
  commentId: string;
};

export const PATCH = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext<Params>) => {
        const params = ctx.params as Params;
        const body = await req.json();
        const input = validate(UpdateCommentSchema, body);
        const comment = await updateComment(params.commentId, ctx.user.id, input);
        return successResponse({ comment }, "Comment updated");
      })
    )
  )
);

export const DELETE = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext<Params>) => {
        const params = ctx.params as Params;
        await deleteComment(params.commentId, ctx.user.id, ctx.membership.role);
        return successResponse(null, "Comment deleted");
      })
    )
  )
);
