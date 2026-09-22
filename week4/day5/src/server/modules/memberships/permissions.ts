import { Role } from "@/types";

/**
 * Checks if the actor can view the members list of an organization.
 * (OWNER, ADMIN, MEMBER)
 */
export function canViewMembers(actorRole: Role): boolean {
  return actorRole === "OWNER" || actorRole === "ADMIN" || actorRole === "MEMBER";
}

/**
 * Checks if the actor can remove a member with targetRole.
 * - OWNER can remove MEMBER and ADMIN (cannot remove OWNER)
 * - ADMIN can remove MEMBER only (cannot remove OWNER or ADMIN)
 * - MEMBER cannot remove anyone
 */
export function canRemoveMember(actorRole: Role, targetRole: Role): boolean {
  if (targetRole === "OWNER") {
    return false;
  }
  if (actorRole === "OWNER") {
    return targetRole === "ADMIN" || targetRole === "MEMBER";
  }
  if (actorRole === "ADMIN") {
    return targetRole === "MEMBER";
  }
  return false;
}

/**
 * Checks if the actor can invite a user with targetRole.
 * - OWNER can invite ADMIN or MEMBER (cannot invite as OWNER)
 * - ADMIN can invite MEMBER only (cannot invite as ADMIN or OWNER)
 * - MEMBER cannot invite anyone
 */
export function canInviteRole(actorRole: Role, targetRole: Role): boolean {
  if (targetRole === "OWNER") {
    return false;
  }
  if (actorRole === "OWNER") {
    return targetRole === "ADMIN" || targetRole === "MEMBER";
  }
  if (actorRole === "ADMIN") {
    return targetRole === "MEMBER";
  }
  return false;
}

/**
 * Checks if the actor can view, resend, or cancel invitations.
 * (OWNER, ADMIN)
 */
export function canManageInvitations(actorRole: Role): boolean {
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

/**
 * Checks if the actor can edit organization details (name, description, logo).
 * (OWNER, ADMIN)
 */
export function canEditOrgDetails(actorRole: Role): boolean {
  return actorRole === "OWNER" || actorRole === "ADMIN";
}

/**
 * Checks if the actor can edit the organization slug.
 * (OWNER only)
 */
export function canEditSlug(actorRole: Role): boolean {
  return actorRole === "OWNER";
}

/**
 * Checks if the actor can delete the organization.
 * (OWNER only)
 */
export function canDeleteOrg(actorRole: Role): boolean {
  return actorRole === "OWNER";
}
