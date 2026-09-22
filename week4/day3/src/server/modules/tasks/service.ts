import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import {
  Role,
  TaskStatus,
  TaskPriority,
  TaskDTO,
  ProjectDashboardDTO,
} from "@/types";
import {
  canCreateTask,
  canEditTask,
  canChangeTaskStatus,
  canReassignTask,
  canDeleteTask,
} from "./permissions";
import {
  CreateTaskInput,
  UpdateTaskInput,
  GetTasksQuery,
} from "./schemas";

async function isUserActiveOnProject(
  projectId: string,
  userId: string | null
): Promise<boolean> {
  if (!userId) return true;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) return false;
  if (project.ownerId === userId) return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  return !!member;
}

export async function createTask(
  projectId: string,
  organizationId: string,
  actorId: string,
  actorRole: Role,
  isProjectMemberOrOwner: boolean,
  input: CreateTaskInput
): Promise<TaskDTO> {
  if (!canCreateTask(actorRole, isProjectMemberOrOwner)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  // If assigneeId is present, verify they are a project member or the project owner
  if (input.assigneeId) {
    const isMember = await isUserActiveOnProject(projectId, input.assigneeId);
    if (!isMember) {
      throw new AppError(400, "Assignee must be a project member");
    }
  }

  const dueDate = input.dueDate ? new Date(input.dueDate) : null;

  const task = await prisma.task.create({
    data: {
      projectId,
      title: input.title,
      description: input.description || null,
      status: input.status || TaskStatus.TODO,
      priority: input.priority || TaskPriority.MEDIUM,
      createdById: actorId,
      assigneeId: input.assigneeId || null,
      dueDate,
      completedAt: input.status === TaskStatus.COMPLETED ? new Date() : null,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      project: {
        select: { id: true, name: true, organizationId: true },
      },
    },
  });

  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    createdById: task.createdById,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    isAssigneeActive: true,
    createdBy: task.createdBy,
    assignee: task.assignee,
    project: task.project,
  };
}

export async function getProjectTasks(
  projectId: string,
  organizationId: string,
  query: GetTasksQuery
) {
  const where: any = {
    projectId,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.assigneeId !== undefined) {
    if (query.assigneeId === "unassigned") {
      where.assigneeId = null;
    } else if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }
  }

  if (query.dueBefore) {
    where.dueDate = { ...where.dueDate, lte: new Date(query.dueBefore) };
  }

  if (query.dueAfter) {
    where.dueDate = { ...where.dueDate, gte: new Date(query.dueAfter) };
  }

  if (query.overdue) {
    const now = new Date();
    where.dueDate = { ...where.dueDate, lt: now };
    where.status = { not: "COMPLETED" };
  }

  if (query.search) {
    const searchFilter = {
      contains: query.search,
      mode: "insensitive" as const,
    };
    where.OR = [
      { title: searchFilter },
      { description: searchFilter },
    ];
  }

  // Sorting
  let orderBy: any = { createdAt: "desc" };
  if (query.sort) {
    const isDesc = query.sort.startsWith("-");
    const field = isDesc ? query.sort.slice(1) : query.sort;
    const direction = isDesc ? "desc" : "asc";

    if (["dueDate", "priority", "createdAt", "title", "status"].includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  const page = query.page || 1;
  const limit = Math.min(query.limit || 25, 100);
  const skip = (page - 1) * limit;

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true, organizationId: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  // Compute isAssigneeActive for each task
  const activeMembers = await prisma.projectMember.findMany({
    where: { projectId },
    select: { userId: true },
  });
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  const activeUserIds = new Set(activeMembers.map((m) => m.userId));
  if (project?.ownerId) activeUserIds.add(project.ownerId);

  const formattedTasks: TaskDTO[] = tasks.map((t) => {
    const isAssigneeActive = !t.assigneeId || activeUserIds.has(t.assigneeId);

    return {
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      createdById: t.createdById,
      assigneeId: t.assigneeId,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      isAssigneeActive,
      createdBy: t.createdBy,
      assignee: t.assignee,
      project: t.project,
    };
  });

  return {
    tasks: formattedTasks,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getMyTasks(
  organizationId: string,
  actorId: string,
  actorRole: Role,
  query: GetTasksQuery
) {
  const isOrgAdmin = actorRole === "OWNER" || actorRole === "ADMIN";

  // Find all projects accessible by actor in this org
  let accessibleProjectIds: string[];

  if (isOrgAdmin) {
    const orgProjects = await prisma.project.findMany({
      where: { organizationId },
      select: { id: true },
    });
    accessibleProjectIds = orgProjects.map((p) => p.id);
  } else {
    const [ownedProjects, memberProjects] = await Promise.all([
      prisma.project.findMany({
        where: { organizationId, ownerId: actorId },
        select: { id: true },
      }),
      prisma.projectMember.findMany({
        where: {
          userId: actorId,
          project: { organizationId },
        },
        select: { projectId: true },
      }),
    ]);

    const ids = new Set([
      ...ownedProjects.map((p) => p.id),
      ...memberProjects.map((m) => m.projectId),
    ]);
    accessibleProjectIds = Array.from(ids);
  }

  // If filtered by specific project, ensure it is within accessibleProjectIds
  if (query.projectId) {
    if (!accessibleProjectIds.includes(query.projectId)) {
      throw new AppError(403, "You do not have access to this project");
    }
    accessibleProjectIds = [query.projectId];
  }

  const where: any = {
    projectId: { in: accessibleProjectIds },
  };

  // Default assigneeId is the caller ("me") unless explicitly overridden
  if (!query.assigneeId || query.assigneeId === "me") {
    where.assigneeId = actorId;
  } else if (query.assigneeId === "unassigned") {
    where.assigneeId = null;
  } else {
    // Non-admin cannot query another user's tasks org-wide
    where.assigneeId = query.assigneeId;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.dueBefore) {
    where.dueDate = { ...where.dueDate, lte: new Date(query.dueBefore) };
  }

  if (query.dueAfter) {
    where.dueDate = { ...where.dueDate, gte: new Date(query.dueAfter) };
  }

  if (query.overdue) {
    const now = new Date();
    where.dueDate = { ...where.dueDate, lt: now };
    where.status = { not: "COMPLETED" };
  }

  if (query.search) {
    const searchFilter = {
      contains: query.search,
      mode: "insensitive" as const,
    };
    where.OR = [
      { title: searchFilter },
      { description: searchFilter },
    ];
  }

  let orderBy: any = { createdAt: "desc" };
  if (query.sort) {
    const isDesc = query.sort.startsWith("-");
    const field = isDesc ? query.sort.slice(1) : query.sort;
    const direction = isDesc ? "desc" : "asc";

    if (["dueDate", "priority", "createdAt", "title", "status"].includes(field)) {
      orderBy = { [field]: direction };
    }
  }

  const page = query.page || 1;
  const limit = Math.min(query.limit || 25, 100);
  const skip = (page - 1) * limit;

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        project: {
          select: { id: true, name: true, organizationId: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    }),
  ]);

  const formattedTasks: TaskDTO[] = await Promise.all(
    tasks.map(async (t) => {
      const isAssigneeActive = await isUserActiveOnProject(t.projectId, t.assigneeId);

      return {
        id: t.id,
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status as TaskStatus,
        priority: t.priority as TaskPriority,
        createdById: t.createdById,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        isAssigneeActive,
        createdBy: t.createdBy,
        assignee: t.assignee,
        project: t.project,
      };
    })
  );

  return {
    tasks: formattedTasks,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getTaskDetail(
  taskId: string,
  projectId: string
): Promise<TaskDTO> {
  // Scoped to projectId to prevent cross-project IDOR
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      project: {
        select: { id: true, name: true, organizationId: true },
      },
    },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const isAssigneeActive = await isUserActiveOnProject(projectId, task.assigneeId);

  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status as TaskStatus,
    priority: task.priority as TaskPriority,
    createdById: task.createdById,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    isAssigneeActive,
    createdBy: task.createdBy,
    assignee: task.assignee,
    project: task.project,
  };
}

export async function updateTask(
  taskId: string,
  projectId: string,
  actorId: string,
  actorRole: Role,
  isProjectOwner: boolean,
  isProjectMemberOrOwner: boolean,
  input: UpdateTaskInput
): Promise<TaskDTO> {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const isTaskCreator = task.createdById === actorId;
  const isTaskAssignee = task.assigneeId === actorId;

  // Split permission checking:
  // If ONLY status is in the body, use canChangeTaskStatus
  const isOnlyStatusUpdate =
    input.status !== undefined &&
    input.title === undefined &&
    input.description === undefined &&
    input.priority === undefined &&
    input.assigneeId === undefined &&
    input.dueDate === undefined;

  if (isOnlyStatusUpdate) {
    if (!canChangeTaskStatus(actorRole, isProjectOwner, isTaskCreator, isTaskAssignee)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
  } else {
    if (!canEditTask(actorRole, isProjectOwner, isTaskCreator, isTaskAssignee)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }
  }

  // Reassignment check
  if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
    if (!canReassignTask(actorRole, isProjectMemberOrOwner)) {
      throw new AppError(403, "You do not have permission to perform this action");
    }

    if (input.assigneeId !== null) {
      const isMember = await isUserActiveOnProject(projectId, input.assigneeId);
      if (!isMember) {
        throw new AppError(400, "Assignee must be a project member");
      }
    }
  }

  const dataToUpdate: any = {};
  if (input.title !== undefined) dataToUpdate.title = input.title;
  if (input.description !== undefined) dataToUpdate.description = input.description;
  if (input.priority !== undefined) dataToUpdate.priority = input.priority;
  if (input.assigneeId !== undefined) dataToUpdate.assigneeId = input.assigneeId;
  if (input.dueDate !== undefined) {
    dataToUpdate.dueDate = input.dueDate ? new Date(input.dueDate) : null;
  }

  // Auto-manage completedAt
  if (input.status !== undefined) {
    dataToUpdate.status = input.status;
    if (input.status === TaskStatus.COMPLETED && task.status !== TaskStatus.COMPLETED) {
      dataToUpdate.completedAt = new Date();
    } else if (input.status !== TaskStatus.COMPLETED && task.status === TaskStatus.COMPLETED) {
      dataToUpdate.completedAt = null;
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: dataToUpdate,
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignee: {
        select: { id: true, name: true, email: true, avatar: true },
      },
      project: {
        select: { id: true, name: true, organizationId: true },
      },
    },
  });

  const isAssigneeActive = await isUserActiveOnProject(projectId, updated.assigneeId);

  return {
    id: updated.id,
    projectId: updated.projectId,
    title: updated.title,
    description: updated.description,
    status: updated.status as TaskStatus,
    priority: updated.priority as TaskPriority,
    createdById: updated.createdById,
    assigneeId: updated.assigneeId,
    dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
    completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    isAssigneeActive,
    createdBy: updated.createdBy,
    assignee: updated.assignee,
    project: updated.project,
  };
}

export async function deleteTask(
  taskId: string,
  projectId: string,
  actorId: string,
  actorRole: Role,
  isProjectOwner: boolean
) {
  const task = await prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const isTaskCreator = task.createdById === actorId;
  if (!canDeleteTask(actorRole, isProjectOwner, isTaskCreator)) {
    throw new AppError(403, "You do not have permission to perform this action");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  return { success: true };
}

export async function getProjectDashboard(
  projectId: string
): Promise<ProjectDashboardDTO> {
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
      },
    },
  });

  if (!project) {
    throw new AppError(404, "Project not found");
  }

  const now = new Date();

  // 1. Total tasks & Status aggregation
  const [totalTasks, statusGroups, overdueCount, overdueTasksList, recentTasksList] =
    await Promise.all([
      prisma.task.count({ where: { projectId } }),
      prisma.task.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { id: true },
      }),
      prisma.task.count({
        where: {
          projectId,
          dueDate: { lt: now },
          status: { not: "COMPLETED" },
        },
      }),
      prisma.task.findMany({
        where: {
          projectId,
          dueDate: { lt: now },
          status: { not: "COMPLETED" },
        },
        take: 5,
        orderBy: { dueDate: "asc" },
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
      prisma.task.findMany({
        where: { projectId },
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          assignee: {
            select: { id: true, name: true, avatar: true },
          },
        },
      }),
    ]);

  const tasksByStatus = {
    todo: 0,
    inProgress: 0,
    review: 0,
    completed: 0,
  };

  for (const group of statusGroups) {
    const count = group._count.id;
    if (group.status === "TODO") tasksByStatus.todo = count;
    else if (group.status === "IN_PROGRESS") tasksByStatus.inProgress = count;
    else if (group.status === "REVIEW") tasksByStatus.review = count;
    else if (group.status === "COMPLETED") tasksByStatus.completed = count;
  }

  const completionPercentage =
    totalTasks > 0
      ? Math.round((tasksByStatus.completed / totalTasks) * 100)
      : 0;

  // Workload per member
  const allMembersList = [
    {
      id: project.owner.id,
      name: project.owner.name,
      email: project.owner.email,
      avatar: project.owner.avatar,
      role: "owner" as const,
    },
    ...project.members
      .filter((m) => m.userId !== project.ownerId)
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        role: "member" as const,
      })),
  ];

  const membersWithCounts = await Promise.all(
    allMembersList.map(async (m) => {
      const assignedTaskCount = await prisma.task.count({
        where: {
          projectId,
          assigneeId: m.id,
        },
      });

      return {
        ...m,
        assignedTaskCount,
      };
    })
  );

  return {
    totalTasks,
    tasksByStatus,
    overdueTasks: {
      count: overdueCount,
      tasks: overdueTasksList.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate ? t.dueDate.toISOString() : null,
        priority: t.priority as TaskPriority,
        status: t.status as TaskStatus,
        assignee: t.assignee,
      })),
    },
    completionPercentage,
    members: membersWithCounts,
    recentTasks: recentTasksList.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status as TaskStatus,
      priority: t.priority as TaskPriority,
      updatedAt: t.updatedAt.toISOString(),
      assignee: t.assignee,
    })),
  };
}
