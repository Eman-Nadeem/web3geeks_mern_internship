import { prisma } from "../../db/prisma";
import { MembershipDTO, UserRole } from "@/types";

interface MemberWithUserRecord {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export async function getOrganizationMembers(organizationId: string): Promise<MembershipDTO[]> {
  const memberships = (await prisma.membership.findMany({
    where: { organizationId },
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
      { role: "asc" }, // OWNER first, then ADMIN, then MEMBER
      { joinedAt: "asc" },
    ],
  })) as unknown as MemberWithUserRecord[];

  return memberships.map((m: MemberWithUserRecord) => ({
    id: m.id,
    userId: m.userId,
    organizationId: m.organizationId,
    role: m.role as UserRole,
    joinedAt: m.joinedAt.toISOString(),
    user: m.user,
  }));
}
