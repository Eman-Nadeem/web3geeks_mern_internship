import crypto from "crypto";
import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import { env } from "../../config/env";
import { sendInvitationEmail } from "../../lib/email";
import { Role, UserRole, InvitationStatus } from "@/types";
import { canInviteRole, canManageInvitations } from "../memberships/permissions";
import { CreateInvitationInput } from "./schemas";

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function computeExpiryDate(): Date {
  const hours = env.INVITATION_EXPIRES_IN_HOURS || 72;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function getAppUrl(): string {
  if (env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
    return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`.replace(/\/$/, "");
  }
  return (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function createInvitation(
  organizationId: string,
  actor: { userId: string; role: Role },
  input: CreateInvitationInput
) {
  // Check RBAC permission for inviting target role
  if (!canInviteRole(actor.role, input.role as Role)) {
    throw AppError.forbidden("You do not have permission to invite members with this role");
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    throw AppError.notFound("Organization not found");
  }

  // Check if target email is already a member of the organization
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: existingUser.id,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      throw AppError.conflict("User is already a member");
    }
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = computeExpiryDate();

  // Check if a PENDING invitation already exists for (organizationId, email)
  const existingPending = await prisma.invitation.findFirst({
    where: {
      organizationId,
      email: input.email,
      status: "PENDING",
    },
  });

  let invitation: any;

  if (existingPending) {
    // Refresh the pending invitation
    invitation = await prisma.invitation.update({
      where: { id: existingPending.id },
      data: {
        token: tokenHash,
        role: input.role as Role,
        invitedById: actor.userId,
        expiresAt,
        status: "PENDING",
      },
    });
  } else {
    // Create new invitation
    invitation = await prisma.invitation.create({
      data: {
        organizationId,
        email: input.email,
        role: input.role as Role,
        token: tokenHash,
        status: "PENDING",
        invitedById: actor.userId,
        expiresAt,
      },
    });
  }

  const inviter = await prisma.user.findUnique({
    where: { id: actor.userId },
  });

  const invitationLink = `${getAppUrl()}/invitations/${rawToken}`;

  // Send invitation email
  await sendInvitationEmail({
    to: input.email,
    inviterName: inviter?.name || "A team administrator",
    organizationName: org.name,
    role: input.role,
    invitationLink,
  });

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role as UserRole,
    status: invitation.status as InvitationStatus,
    expiresAt: invitation.expiresAt instanceof Date ? invitation.expiresAt.toISOString() : new Date(invitation.expiresAt).toISOString(),
    rawToken,
    invitationLink,
  };
}

export async function getOrganizationInvitations(organizationId: string) {
  const invitations = await prisma.invitation.findMany({
    where: { organizationId },
    include: {
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations.map((inv: any) => ({
    id: inv.id,
    email: inv.email,
    organizationId: inv.organizationId,
    role: inv.role as UserRole,
    status: inv.status as InvitationStatus,
    createdAt: inv.createdAt instanceof Date ? inv.createdAt.toISOString() : new Date(inv.createdAt).toISOString(),
    expiresAt: inv.expiresAt instanceof Date ? inv.expiresAt.toISOString() : new Date(inv.expiresAt).toISOString(),
    acceptedAt: inv.acceptedAt ? (inv.acceptedAt instanceof Date ? inv.acceptedAt.toISOString() : new Date(inv.acceptedAt).toISOString()) : null,
    invitedBy: inv.invitedBy,
  }));
}

export async function resendInvitation(
  organizationId: string,
  invitationId: string,
  actor: { userId: string; role: Role }
) {
  if (!canManageInvitations(actor.role)) {
    throw AppError.forbidden("You do not have permission to resend invitations");
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      organizationId,
    },
    include: {
      organization: true,
    },
  });

  if (!invitation) {
    throw AppError.notFound("Invitation not found");
  }

  if (invitation.status === "ACCEPTED") {
    throw AppError.conflict("Invitation already used");
  }

  if (invitation.status === "CANCELLED") {
    throw AppError.badRequest("Cannot resend a cancelled invitation");
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = computeExpiryDate();

  const updated = await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      token: tokenHash,
      expiresAt,
      status: "PENDING",
      invitedById: actor.userId,
    },
  });

  const inviter = await prisma.user.findUnique({
    where: { id: actor.userId },
  });

  const invitationLink = `${getAppUrl()}/invitations/${rawToken}`;

  await sendInvitationEmail({
    to: updated.email,
    inviterName: inviter?.name || "A team administrator",
    organizationName: invitation.organization.name,
    role: updated.role,
    invitationLink,
  });

  return {
    id: updated.id,
    email: updated.email,
    role: updated.role as UserRole,
    status: updated.status as InvitationStatus,
    expiresAt: updated.expiresAt instanceof Date ? updated.expiresAt.toISOString() : new Date(updated.expiresAt).toISOString(),
    rawToken,
    invitationLink,
  };
}

export async function cancelInvitation(
  organizationId: string,
  invitationId: string,
  actor: { userId: string; role: Role }
) {
  if (!canManageInvitations(actor.role)) {
    throw AppError.forbidden("You do not have permission to cancel invitations");
  }

  const invitation = await prisma.invitation.findFirst({
    where: {
      id: invitationId,
      organizationId,
    },
  });

  if (!invitation) {
    throw AppError.notFound("Invitation not found");
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { status: "CANCELLED" },
  });
}

export async function getInvitationByToken(
  rawToken: string,
  currentUser?: { id: string; email: string } | null
) {
  const tokenHash = hashToken(rawToken);

  const invitation = await prisma.invitation.findUnique({
    where: { token: tokenHash },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          description: true,
        },
      },
      invitedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    throw AppError.notFound("Invitation not found");
  }

  if (invitation.status === "ACCEPTED" || invitation.status === "CANCELLED") {
    throw AppError.conflict("Invitation already used");
  }

  const isExpired =
    invitation.status === "EXPIRED" || new Date(invitation.expiresAt).getTime() < Date.now();

  if (isExpired) {
    if (invitation.status !== "EXPIRED") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    throw new AppError(410, "Invitation has expired");
  }

  const isMatchingUser =
    !!currentUser && currentUser.email.toLowerCase() === invitation.email.toLowerCase();

  const targetUser = await prisma.user.findUnique({
    where: { email: invitation.email.toLowerCase() },
    select: { id: true, name: true, email: true },
  });
  const accountExists = !!targetUser;

  let isAlreadyMember = false;
  if (currentUser) {
    const existingMembership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: currentUser.id,
          organizationId: invitation.organization.id,
        },
      },
    });
    isAlreadyMember = !!existingMembership;
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role as UserRole,
    organization: invitation.organization,
    invitedBy: invitation.invitedBy,
    expiresAt:
      invitation.expiresAt instanceof Date
        ? invitation.expiresAt.toISOString()
        : new Date(invitation.expiresAt).toISOString(),
    status: invitation.status as InvitationStatus,
    isMatchingUser,
    isAuthenticated: !!currentUser,
    currentUserEmail: currentUser?.email,
    accountExists,
    isAlreadyMember,
  };
}

export async function acceptInvitation(
  rawToken: string,
  user: { id: string; email: string }
) {
  const tokenHash = hashToken(rawToken);

  const invitation = await prisma.invitation.findUnique({
    where: { token: tokenHash },
    include: {
      organization: true,
    },
  });

  if (!invitation) {
    throw AppError.notFound("Invitation not found");
  }

  if (invitation.status === "ACCEPTED" || invitation.status === "CANCELLED") {
    throw AppError.conflict("Invitation already used");
  }

  const isExpired =
    invitation.status === "EXPIRED" || new Date(invitation.expiresAt).getTime() < Date.now();

  if (isExpired) {
    if (invitation.status !== "EXPIRED") {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
    }
    throw new AppError(410, "Invitation has expired");
  }

  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    throw AppError.forbidden("This invitation was sent to a different email address");
  }

  try {
    await prisma.$transaction(async (tx: any) => {
      const existingMember = await tx.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: invitation.organizationId,
          },
        },
      });

      if (existingMember) {
        // User already has membership, idempotently mark invitation as ACCEPTED
        await tx.invitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });
        return;
      }

      await tx.membership.create({
        data: {
          userId: user.id,
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      });

      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      // Idempotent catch if duplicate membership race condition occurred
    } else {
      throw err;
    }
  }

  return {
    organizationId: invitation.organizationId,
    organizationSlug: invitation.organization.slug,
  };
}
