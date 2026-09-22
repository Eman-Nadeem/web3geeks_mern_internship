import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole } from "@/server/http/with-org-role";
import { withProjectAccess, ProjectContext } from "@/server/http/with-project-access";
import { successResponse } from "@/server/http/response";
import { validate } from "@/server/http/validate";
import {
  CreateCommentSchema,
  ListCommentsQuerySchema,
} from "@/server/modules/comments/schemas";
import {
  createComment,
  listComments,
} from "@/server/modules/comments/service";

type Params = { organizationId: string; projectId: string; taskId: string };

export const GET = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext<Params>) => {
        const params = ctx.params as Params;
        const query = validate(ListCommentsQuerySchema, Object.fromEntries(req.nextUrl.searchParams));
        const result = await listComments(params.taskId, params.projectId, query);
        return successResponse(result, "Comments fetched");
      })
    )
  )
);

export const POST = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext<Params>) => {
        const params = ctx.params as Params;
        const body = await req.json();
        const input = validate(CreateCommentSchema, body);
        const comment = await createComment(
          params.taskId,
          params.projectId,
          ctx.organization.id,
          ctx.user.id,
          input
        );
        return successResponse({ comment }, "Comment created", 201);
      })
    )
  )
);
