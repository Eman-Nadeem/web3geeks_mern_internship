import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import {
  Role,
  ProjectStatus,
  ProjectListItemDTO,
  ProjectDetailDTO,
  ProjectMemberDTO,
} from "@/types";
import {
  canCreateProject,
  canManageProject,
  canDeleteProject,
  canManageProjectMembers,
  canReassignProjectOwner,
} from "./permissions";
import {
  CreateProjectInput,
  UpdateProjectInput,
  GetProjectsQuery,
} from "./schemas";

export async function createProject(
  organizationId: string,
  actorId: string,
  actorRole: Role,
  input: CreateProjectInput
) {
  if (!canCreateProject(actorRole)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  const effectiveOwnerId = input.ownerId || actorId;

  // Verify owner belongs to this organization
  const ownerMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: effectiveOwnerId,
        organizationId,
      },
    },
  });

  if (!ownerMembership) {
    throw new AppError(400, "Owner must be an organization member");
  }

  const project = await prisma.project.create({
    data: {
      organizationId,
      name: input.name,
      description: input.description || null,
      status: input.status || ProjectStatus.PLANNING,
      ownerId: effectiveOwnerId,
      createdById: actorId,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });

  // If creator is not the owner, add creator as a project member so they retain visibility
  if (effectiveOwnerId !== actorId) {
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: actorId,
        addedById: actorId,
      },
    });
  }

  return project;
}

export async function getOrganizationProjects(
  organizationId: string,
  actorId: string,
  actorRole: Role,
  query: GetProjectsQuery
): Promise<ProjectListItemDTO[]> {
  const isOrgAdmin = actorRole === "OWNER" || actorRole === "ADMIN";

  const whereConditions: any = {
    organizationId,
  };

  if (!isOrgAdmin) {
    whereConditions.OR = [
      { ownerId: actorId },
      { members: { some: { userId: actorId } } },
    ];
  }

  if (query.status) {
    whereConditions.status = query.status;
  }

  if (query.search) {
    const searchFilter = {
      contains: query.search,
      mode: "insensitive" as const,
    };
    if (whereConditions.OR) {
      // Must satisfy ownership/membership AND search
      whereConditions.AND = [
        { OR: whereConditions.OR },
        {
          OR: [
            { name: searchFilter },
            { description: searchFilter },
          ],
        },
      ];
      delete whereConditions.OR;
    } else {
      whereConditions.OR = [
        { name: searchFilter },
        { description: searchFilter },
      ];
    }
  }

  const projects = await prisma.project.findMany({
    where: whereConditions,
    include: {
      owner: {
        select: { id: true, name: true, avatar: true },
      },
      _count: {
        select: {
          members: true,
          tasks: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // For each project, fetch completed tasks count to calculate completion percentage
  const listItems: ProjectListItemDTO[] = await Promise.all(
    projects.map(async (p) => {
      const completedCount = await prisma.task.count({
        where: {
          projectId: p.id,
          status: "COMPLETED",
        },
      });

      const totalTasks = p._count?.tasks ?? 0;
      const completionPercentage =
        totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

      // Note: member count includes project members + 1 (the owner)
      const memberCount = (p._count?.members ?? 0) + 1;

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        status: p.status as ProjectStatus,
        owner: {
          id: p.owner.id,
          name: p.owner.name,
          avatar: p.owner.avatar,
        },
        memberCount,
        taskCount: totalTasks,
        createdAt: p.createdAt.toISOString(),
        completionPercentage,
      };
    })
  );

  return listItems;
}

export async function getProjectDetail(
  projectId: string,
  organizationId: string,
  actorId: string,
  actorRole: Role
): Promise<ProjectDetailDTO> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
    },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
      },
    },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  // Task status counts
  const taskGroupResults = await prisma.task.groupBy({
    by: ["status"],
    where: { projectId },
    _count: { id: true },
  });

  const taskCounts = {
    todo: 0,
    inProgress: 0,
    review: 0,
    completed: 0,
    total: 0,
  };

  for (const group of taskGroupResults) {
    const count = group._count.id;
    taskCounts.total += count;
    if (group.status === "TODO") taskCounts.todo = count;
    else if (group.status === "IN_PROGRESS") taskCounts.inProgress = count;
    else if (group.status === "REVIEW") taskCounts.review = count;
    else if (group.status === "COMPLETED") taskCounts.completed = count;
  }

  // Format members list: Owner (with role="owner") + Members (with role="member")
  const members: ProjectMemberDTO[] = [
    {
      id: `owner-${project.owner.id}`,
      userId: project.owner.id,
      projectId: project.id,
      addedAt: project.createdAt.toISOString(),
      role: "owner",
      user: project.owner,
    },
    ...project.members
      .filter((m) => m.userId !== project.ownerId)
      .map((m) => ({
        id: m.id,
        userId: m.userId,
        projectId: m.projectId,
        addedAt: m.addedAt.toISOString(),
        role: "member" as const,
        user: m.user,
      })),
  ];

  let currentUserRole: "owner" | "member" | "org-admin" = "member";
  if (actorRole === "OWNER" || actorRole === "ADMIN") {
    currentUserRole = project.ownerId === actorId ? "owner" : "org-admin";
  } else if (project.ownerId === actorId) {
    currentUserRole = "owner";
  }

  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status as ProjectStatus,
    organizationId: project.organizationId,
    ownerId: project.ownerId,
    createdById: project.createdById,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    owner: project.owner,
    createdBy: project.createdBy,
    members,
    taskCounts,
    currentUserRole,
  };
}

export async function updateProject(
  projectId: string,
  organizationId: string,
  actorRole: Role,
  isProjectOwner: boolean,
  input: UpdateProjectInput
) {
  if (!canManageProject(actorRole, isProjectOwner)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  const dataToUpdate: any = {};
  if (input.name !== undefined) dataToUpdate.name = input.name;
  if (input.description !== undefined) dataToUpdate.description = input.description;
  if (input.status !== undefined) dataToUpdate.status = input.status;

  if (input.ownerId !== undefined) {
    if (!canReassignProjectOwner(actorRole)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }

    // Verify new owner is an org member
    const newOwnerMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: input.ownerId,
          organizationId,
        },
      },
    });

    if (!newOwnerMembership) {
      throw new AppError(400, "Owner must be an organization member");
    }

    dataToUpdate.ownerId = input.ownerId;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: dataToUpdate,
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });

  return updated;
}

export async function deleteProject(
  projectId: string,
  actorRole: Role
) {
  if (!canDeleteProject(actorRole)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  await prisma.project.delete({
    where: { id: projectId },
  });

  return { success: true };
}

export async function getProjectMembers(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { addedAt: "asc" },
      },
    },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const members: ProjectMemberDTO[] = [
    {
      id: `owner-${project.owner.id}`,
      userId: project.owner.id,
      projectId: project.id,
      addedAt: project.createdAt.toISOString(),
      role: "owner",
      user: project.owner,
    },
    ...project.members
      .filter((m) => m.userId !== project.ownerId)
      .map((m) => ({
        id: m.id,
        userId: m.userId,
        projectId: m.projectId,
        addedAt: m.addedAt.toISOString(),
        role: "member" as const,
        user: m.user,
      })),
  ];

  return members;
}

export async function addProjectMember(
  projectId: string,
  organizationId: string,
  actorId: string,
  actorRole: Role,
  isProjectOwner: boolean,
  targetUserId: string
) {
  if (!canManageProjectMembers(actorRole, isProjectOwner)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  // 1. MUST verify userId belongs to this organizationId via Membership lookup
  const orgMembership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: {
        userId: targetUserId,
        organizationId,
      },
    },
  });

  if (!orgMembership) {
    throw new AppError(400, "User is not a member of this organization");
  }

  // 2. Check if user is the project owner
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  if (project.ownerId === targetUserId) {
    throw new AppError(409, "User is already a project member");
  }

  // 3. Check if already a project member
  const existingMember = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });

  if (existingMember) {
    throw new AppError(409, "User is already a project member");
  }

  // 4. Create ProjectMember
  const member = await prisma.projectMember.create({
    data: {
      projectId,
      userId: targetUserId,
      addedById: actorId,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true },
      },
    },
  });

  return member;
}

export async function removeProjectMember(
  projectId: string,
  organizationId: string,
  actorRole: Role,
  isProjectOwner: boolean,
  targetUserId: string
) {
  if (!canManageProjectMembers(actorRole, isProjectOwner)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  if (project.ownerId === targetUserId) {
    throw new AppError(400, "Reassign the project owner before removing them");
  }

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });

  if (!member) {
    throw new AppError(404, "Project member not found");
  }

  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId,
        userId: targetUserId,
      },
    },
  });

  return { success: true };
}
