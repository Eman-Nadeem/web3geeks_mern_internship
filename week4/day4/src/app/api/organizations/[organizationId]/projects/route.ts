import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { successResponse } from "@/server/http/response";
import {
  createProject,
  getOrganizationProjects,
} from "@/server/modules/projects/service";
import {
  createProjectSchema,
  getProjectsQuerySchema,
} from "@/server/modules/projects/schemas";

export const runtime = "nodejs";

export const POST = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN"], async (req: NextRequest, ctx: OrgRoleContext) => {
      const body = await req.json();
      const input = createProjectSchema.parse(body);

      const project = await createProject(
        ctx.organization.id,
        ctx.user.id,
        ctx.membership.role,
        input
      );

      return successResponse(
        { project },
        "Project created successfully",
        201
      );
    })
  )
);

export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN", "MEMBER"], async (req: NextRequest, ctx: OrgRoleContext) => {
      const url = new URL(req.url);
      const query = getProjectsQuerySchema.parse({
        status: url.searchParams.get("status") || undefined,
        search: url.searchParams.get("search") || undefined,
      });

      const projects = await getOrganizationProjects(
        ctx.organization.id,
        ctx.user.id,
        ctx.membership.role,
        query
      );

      return successResponse(
        { projects },
        "Projects retrieved successfully",
        200
      );
    })
  )
);
