import { NextRequest } from "next/server";
import { z } from "zod";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { withProjectAccess, ProjectContext } from "@/server/http/with-project-access";
import { successResponse } from "@/server/http/response";
import { validate } from "@/server/http/validate";
import { getProjectActivity } from "@/server/modules/activity/service";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  type: z.string().optional(),
});

type Params = { organizationId: string; projectId: string };

export const GET = withHandler(
  withAuth(
    withOrgRole(
      ["OWNER", "ADMIN", "MEMBER"],
      withProjectAccess(async (req: NextRequest, ctx: ProjectContext<Params>) => {
        const query = validate(QuerySchema, Object.fromEntries(req.nextUrl.searchParams));
        const result = await getProjectActivity(ctx.project.id, query);
        return successResponse(result, "Activity fetched");
      })
    )
  )
);
