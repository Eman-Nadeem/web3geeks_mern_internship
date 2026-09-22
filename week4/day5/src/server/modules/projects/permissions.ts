import { Role } from "@/types";

/**
 * Checks if the actor can view a specific project.
 * - Org OWNER/ADMIN: can view all projects in the org
 * - Project Owner: can view
 * - Project Member: can view
 * - Org Member (not on project): cannot view (false)
 */
export function canViewProject(
  actorOrgRole: Role,
  isProjectMemberOrOwner: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  return isProjectMemberOrOwner;
}

/**
 * Checks if the actor can create a project in the organization.
 * - Org OWNER/ADMIN: yes
 * - Org MEMBER: no
 */
export function canCreateProject(actorOrgRole: Role): boolean {
  return actorOrgRole === "OWNER" || actorOrgRole === "ADMIN";
}

/**
 * Checks if the actor can update project details and status.
 * - Org OWNER/ADMIN: yes
 * - Project Owner: yes
 * - Project Member / non-member: no
 */
export function canManageProject(
  actorOrgRole: Role,
  isProjectOwner: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  return isProjectOwner;
}

/**
 * Checks if the actor can delete a project.
 * - ONLY Org OWNER/ADMIN: yes
 * - Project Owner (if not Org Owner/Admin): NO (destructive cascade)
 * - Project Member / non-member: no
 */
export function canDeleteProject(actorOrgRole: Role): boolean {
  return actorOrgRole === "OWNER" || actorOrgRole === "ADMIN";
}

/**
 * Checks if the actor can add or remove project members.
 * - Org OWNER/ADMIN: yes
 * - Project Owner: yes
 * - Project Member: no
 */
export function canManageProjectMembers(
  actorOrgRole: Role,
  isProjectOwner: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  return isProjectOwner;
}

/**
 * Checks if the actor can reassign the project owner.
 * - ONLY Org OWNER/ADMIN: yes
 * - Project Owner / Member: no
 */
export function canReassignProjectOwner(actorOrgRole: Role): boolean {
  return actorOrgRole === "OWNER" || actorOrgRole === "ADMIN";
}
