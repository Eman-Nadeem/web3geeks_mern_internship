export const Role = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MEMBER: "MEMBER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
export type UserRole = Role;

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
  ownerId: string;
  createdAt: string;
  role: UserRole;
  memberCount: number;
}

export interface OrganizationDetailDTO {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  currentUserRole: UserRole;
  counts: {
    members: number;
    projects: number;
    tasks: number;
  };
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}
