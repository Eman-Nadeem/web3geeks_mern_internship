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
