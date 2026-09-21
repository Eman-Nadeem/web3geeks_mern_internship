import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import { OrganizationDTO, OrganizationDetailDTO, UserRole, Role } from "@/types";
import { CreateOrgInput, UpdateOrgInput } from "./schemas";

export async function createOrganization(
  userId: string,
  input: CreateOrgInput
): Promise<OrganizationDTO> {
  // Check if slug already exists
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });

  if (existingOrg) {
    throw new AppError(409, "Organization slug already taken");
  }

  // Create organization and OWNER membership in a single transaction
  const organization = await prisma.$transaction(async (tx: any) => {
    const org = await tx.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        ownerId: userId,
      },
    });

    await tx.membership.create({
      data: {
        userId,
        organizationId: org.id,
        role: Role.OWNER,
      },
    });

    return org;
  });

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    ownerId: organization.ownerId,
    createdAt: organization.createdAt.toISOString(),
    role: "OWNER",
    memberCount: 1,
  };
}

interface UserMembershipRecord {
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
    _count: {
      memberships: number;
    };
  };
}

export async function getUserOrganizations(userId: string): Promise<OrganizationDTO[]> {
  const memberships = (await prisma.membership.findMany({
    where: { userId },
    include: {
      organization: {
        include: {
          _count: {
            select: { memberships: true },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  })) as unknown as UserMembershipRecord[];

  return memberships.map((m: UserMembershipRecord) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    ownerId: m.organization.ownerId,
    createdAt: m.organization.createdAt.toISOString(),
    role: m.role as UserRole,
    memberCount: m.organization._count.memberships,
  }));
}

export async function getOrganizationDetail(
  organizationId: string,
  currentUserRole: UserRole
): Promise<OrganizationDetailDTO> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: { memberships: true },
      },
    },
  });

  if (!org) {
    throw new AppError(404, "Organization not found");
  }

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    ownerId: org.ownerId,
    createdAt: org.createdAt.toISOString(),
    currentUserRole,
    counts: {
      members: org._count.memberships,
      projects: 0,
      tasks: 0,
    },
  };
}

export async function updateOrganization(
  organizationId: string,
  input: UpdateOrgInput
): Promise<{ id: string; name: string; slug: string; updatedAt: string }> {
  const updatedOrg = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name: input.name,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      updatedAt: true,
    },
  });

  return {
    ...updatedOrg,
    updatedAt: updatedOrg.updatedAt.toISOString(),
  };
}

export async function deleteOrganization(
  organizationId: string
): Promise<{ id: string; name: string }> {
  const deletedOrg = await prisma.organization.delete({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
    },
  });

  return deletedOrg;
}
