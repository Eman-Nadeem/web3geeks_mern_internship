import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import { OrganizationDTO, OrganizationDetailDTO, UserRole, Role } from "@/types";
import { canEditOrgDetails, canEditSlug } from "../memberships/permissions";
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
    description: organization.description || null,
    logoUrl: organization.logoUrl || null,
    ownerId: organization.ownerId,
    createdAt: organization.createdAt instanceof Date ? organization.createdAt.toISOString() : new Date(organization.createdAt).toISOString(),
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
    description: string | null;
    logoUrl: string | null;
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
    description: m.organization.description || null,
    logoUrl: m.organization.logoUrl || null,
    ownerId: m.organization.ownerId,
    createdAt: m.organization.createdAt instanceof Date ? m.organization.createdAt.toISOString() : new Date(m.organization.createdAt).toISOString(),
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
    description: org.description || null,
    logoUrl: org.logoUrl || null,
    ownerId: org.ownerId,
    createdAt: org.createdAt instanceof Date ? org.createdAt.toISOString() : new Date(org.createdAt).toISOString(),
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
  input: UpdateOrgInput,
  actorRole: Role
): Promise<{ id: string; name: string; slug: string; description: string | null; logoUrl: string | null; updatedAt: string }> {
  if (!canEditOrgDetails(actorRole)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  if (input.slug !== undefined) {
    if (!canEditSlug(actorRole)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }

    const existingSlug = await prisma.organization.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (existingSlug && existingSlug.id !== organizationId) {
      throw new AppError(409, "Organization slug already taken");
    }
  }

  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl === "" ? null : input.logoUrl;
  if (input.slug !== undefined) updateData.slug = input.slug;

  try {
    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        updatedAt: true,
      },
    });

    return {
      ...updatedOrg,
      updatedAt: updatedOrg.updatedAt instanceof Date ? updatedOrg.updatedAt.toISOString() : new Date(updatedOrg.updatedAt).toISOString(),
    };
  } catch (err: any) {
    if (err.code === "P2002") {
      throw new AppError(409, "Organization slug already taken");
    }
    throw err;
  }
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
