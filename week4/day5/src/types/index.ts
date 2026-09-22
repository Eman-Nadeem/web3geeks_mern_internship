export const Role = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
export type UserRole = Role;

export const InvitationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
} as const;

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const ProjectStatus = {
  PLANNING: "PLANNING",
  ACTIVE: "ACTIVE",
  ON_HOLD: "ON_HOLD",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW: "REVIEW",
  COMPLETED: "COMPLETED",
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TaskPriority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  createdAt: string;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  ownerId: string;
  createdAt: string;
  role: UserRole;
  memberCount: number;
}

export interface OrganizationDetailDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  ownerId: string;
  createdAt: string;
  currentUserRole: UserRole;
  counts: {
    members: number;
    projects: number;
    tasks: number;
  };
}

export interface MemberItemDTO {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar: string | null;
  role: UserRole;
  joinedAt: string;
}

export interface MembershipDTO {
  id: string;
  userId: string;
  organizationId: string;
  role: UserRole;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export interface InvitationDTO {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  invitedBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PublicInvitationDTO {
  id: string;
  email: string;
  role: UserRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    description: string | null;
  };
  invitedBy: {
    name: string;
    email: string;
  };
  expiresAt: string;
  status: InvitationStatus;
  isMatchingUser: boolean;
  isAuthenticated: boolean;
  currentUserEmail?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

export interface ProjectListItemDTO {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  };
  memberCount: number;
  taskCount: number;
  createdAt: string;
  completionPercentage?: number;
}

export interface ProjectMemberDTO {
  id: string;
  userId: string;
  projectId: string;
  addedAt: string;
  role: "owner" | "member";
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export interface ProjectDetailDTO {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  organizationId: string;
  ownerId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  members: ProjectMemberDTO[];
  taskCounts: {
    todo: number;
    inProgress: number;
    review: number;
    completed: number;
    total: number;
  };
  currentUserRole?: "owner" | "member" | "org-admin";
}

export interface TaskDTO {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdById: string;
  assigneeId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isAssigneeActive: boolean;
  project?: {
    id: string;
    name: string;
    organizationId?: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
}

export interface ProjectDashboardDTO {
  totalTasks: number;
  tasksByStatus: {
    todo: number;
    inProgress: number;
    review: number;
    completed: number;
  };
  overdueTasks: {
    count: number;
    tasks: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      priority: TaskPriority;
      status: TaskStatus;
      assignee: {
        id: string;
        name: string;
        avatar: string | null;
      } | null;
    }>;
  };
  completionPercentage: number;
  members: Array<{
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: "owner" | "member";
    assignedTaskCount: number;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    updatedAt: string;
    assignee: {
      id: string;
      name: string;
      avatar: string | null;
    } | null;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Day 4 Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CommentDTO {
  id: string;
  taskId: string;
  body: string;
  status: "ACTIVE" | "DELETED";
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export type ActivityType =
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "TASK_DELETED"
  | "TASK_STATUS_CHANGED"
  | "TASK_ASSIGNED"
  | "TASK_COMMENT_ADDED"
  | "TASK_COMMENT_DELETED"
  | "PROJECT_CREATED"
  | "PROJECT_UPDATED"
  | "PROJECT_DELETED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "MEMBER_ROLE_CHANGED";

export interface ActivityDTO {
  id: string;
  organizationId: string;
  projectId: string | null;
  taskId: string | null;
  actorId: string;
  type: ActivityType;
  meta: Record<string, unknown>;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
}

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_COMMENT"
  | "PROJECT_INVITATION"
  | "MEMBER_JOINED"
  | "MENTION";

export interface NotificationDTO {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  readAt: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface PresenceDTO {
  userId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
}

