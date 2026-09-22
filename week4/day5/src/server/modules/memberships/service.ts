import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import { Role, UserRole } from "@/types";
import { canRemoveMember } from "./permissions";
import { GetMembersQuery } from "./schemas";
import { logActivity } from "../activity/service";

export interface MemberListItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: UserRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export async function getOrganizationMembers(
  organizationId: string,
  query?: GetMembersQuery
): Promise<MemberListItem[]> {
  const whereClause: any = { organizationId };

  if (query?.role) {
    whereClause.role = query.role;
  }

  if (query?.search) {
    const searchTerm = query.search.trim();
    whereClause.user = {
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
      ],
    };
  }

  const memberships = await prisma.membership.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: [
      { role: "asc" },
      { joinedAt: "asc" },
    ],
  });

  return memberships.map((m: any) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    avatar: m.user.avatar,
    role: m.role as UserRole,
    joinedAt: m.joinedAt instanceof Date ? m.joinedAt.toISOString() : new Date(m.joinedAt).toISOString(),
    user: m.user,
  }));
}

export async function removeOrganizationMember(
  organizationId: string,
  membershipId: string,
  actor: { userId: string; role: Role }
): Promise<void> {
  const membership = await prisma.membership.findFirst({
    where: {
      id: membershipId,
      organizationId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!membership) {
    throw AppError.notFound("Membership not found");
  }

  // 1. Cannot remove self via this endpoint
  if (membership.userId === actor.userId) {
    throw AppError.badRequest("Use organization settings to leave an organization");
  }

  // 2. Check declarative permission matrix (e.g. Admin cannot remove Admin or Owner -> 403)
  if (!canRemoveMember(actor.role, membership.role as Role)) {
    // If target is OWNER, also check if it's the last owner for 409 or 403
    if (membership.role === "OWNER") {
      const ownerCount = await prisma.membership.count({
        where: {
          organizationId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1 && actor.role === "OWNER") {
        throw AppError.conflict("An organization must have at least one owner");
      }
    }

    throw AppError.forbidden("You do not have permission to remove this member");
  }

  // 3. Cannot remove last OWNER of an organization
  if (membership.role === "OWNER") {
    const ownerCount = await prisma.membership.count({
      where: {
        organizationId,
        role: "OWNER",
      },
    });

    if (ownerCount <= 1) {
      throw AppError.conflict("An organization must have at least one owner");
    }
  // 4. Cascade project membership removals within this organization
  await prisma.projectMember.deleteMany({
    where: {
      userId: membership.userId,
      project: {
        organizationId,
      },
    },
  });

  await prisma.membership.delete({
    where: { id: membership.id },
  });

  void logActivity({
    organizationId,
    actorId: actor.userId,
    type: "MEMBER_REMOVED",
    meta: {
      removedUserId: membership.userId,
      removedUserName: membership.user?.name,
      removedUserEmail: membership.user?.email,
      role: membership.role,
    },
  });
}}
