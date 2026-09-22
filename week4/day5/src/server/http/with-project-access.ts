import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AppError } from "./AppError";
import { OrgRoleContext } from "./with-org-role";
import { ProjectStatus } from "@/types";

export type ProjectRole = "owner" | "member" | "org-admin";

export interface ProjectContext<
  TParams = { organizationId: string; projectId: string }
> extends OrgRoleContext<TParams> {
  project: {
    id: string;
    organizationId: string;
    name: string;
    description: string | null;
    status: ProjectStatus;
    ownerId: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
  };
  projectRole: ProjectRole;
  isProjectOwner: boolean;
  isProjectMember: boolean;
}

export type ProjectHandler<
  TParams = { organizationId: string; projectId: string }
> = (
  req: NextRequest,
  ctx: ProjectContext<TParams>
) => Promise<NextResponse> | NextResponse;

const uuidSchema = z.string().uuid();

export function withProjectAccess<
  TParams extends { organizationId: string; projectId: string } = {
    organizationId: string;
    projectId: string;
  }
>(handler: ProjectHandler<TParams>) {
  return async (
    req: NextRequest,
    ctx: OrgRoleContext<TParams>
  ): Promise<NextResponse> => {
    const params = await Promise.resolve(ctx.params);
    const { projectId } = params as any;

    // 1. Validate projectId is a UUID (400 "Invalid project ID")
    if (!projectId || !uuidSchema.safeParse(projectId).success) {
      throw new AppError(400, "Invalid project ID");
    }

    // 2. Fetch the project WITH an organizationId filter matching the route's :organizationId
    // (never fetch by projectId alone — prevents IDOR across orgs)
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId: ctx.organization.id,
      },
    });

    // 3. 404 "Project not found" if no match
    if (!project) {
      throw new AppError(404, "Project not found");
    }

    // 4. Access evaluation
    let projectRole: ProjectRole;
    const isOwner = project.ownerId === ctx.user.id;

    if (ctx.membership.role === "OWNER" || ctx.membership.role === "ADMIN") {
      projectRole = isOwner ? "owner" : "org-admin";
    } else if (isOwner) {
      projectRole = "owner";
    } else {
      const membership = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: ctx.user.id,
          },
        },
      });

      if (!membership) {
        throw new AppError(403, "You do not have access to this project");
      }
      projectRole = "member";
    }

    // 5. Inject ctx.project and role metadata
    const projectCtx: ProjectContext<TParams> = {
      ...ctx,
      project: {
        ...project,
        status: project.status as ProjectStatus,
      },
      projectRole,
      isProjectOwner: isOwner,
      isProjectMember: projectRole === "member" || isOwner,
    };

    return handler(req, projectCtx);
  };
}
