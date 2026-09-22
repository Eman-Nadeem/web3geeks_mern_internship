import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { AppError } from "./AppError";
import { AuthenticatedContext } from "./with-auth";
import { UserRole } from "@/types";

export interface OrgRoleContext<TParams = { organizationId: string }>
  extends AuthenticatedContext<TParams> {
  organization: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  };
  membership: {
    id: string;
    userId: string;
    organizationId: string;
    role: UserRole;
    joinedAt: Date;
  };
}

export type OrgRoleHandler<TParams = { organizationId: string }> = (
  req: NextRequest,
  ctx: OrgRoleContext<TParams>
) => Promise<NextResponse> | NextResponse;

const uuidSchema = z.string().uuid();

export function withOrgRole<TParams extends { organizationId: string } = { organizationId: string }>(
  allowedRoles: UserRole[],
  handler: OrgRoleHandler<TParams>
) {
  return async (
    req: NextRequest,
    ctx: AuthenticatedContext<TParams>
  ): Promise<NextResponse> => {
    // 1. Confirm authenticated (already checked by withAuth, but safety assert)
    if (!ctx.user || !ctx.user.id) {
      throw new AppError(401, "Authentication required");
    }

    const params = await Promise.resolve(ctx.params);
    const { organizationId } = params;

    // 2. Validate organizationId is a UUID
    if (!organizationId || !uuidSchema.safeParse(organizationId).success) {
      throw new AppError(400, "Invalid organization ID");
    }

    // 3. Confirm the organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new AppError(404, "Organization not found");
    }

    // 4. Confirm the user has a Membership in it
    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: ctx.user.id,
          organizationId: organization.id,
        },
      },
    });

    if (!membership) {
      throw new AppError(403, "You do not have access to this organization");
    }

    // 5. Confirm the role is in allowedRoles
    if (!allowedRoles.includes(membership.role as UserRole)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }

    // 6. Inject ctx.organization and ctx.membership
    const orgContext: OrgRoleContext<TParams> = {
      ...ctx,
      organization,
      membership: {
        ...membership,
        role: membership.role as UserRole,
      },
    };

    return handler(req, orgContext);
  };
}
