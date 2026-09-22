import { Role } from "@/types";

/**
 * Checks if the actor can create a task in the project.
 * - Org OWNER/ADMIN: yes
 * - Project Owner / Project Member: yes
 * - Org Member (not on project): no
 */
export function canCreateTask(
  actorOrgRole: Role,
  isProjectMemberOrOwner: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  return isProjectMemberOrOwner;
}

/**
 * Checks if the actor can update task fields (title, description, priority, dueDate, etc.).
 * - Org OWNER/ADMIN: yes
 * - Project Owner: yes
 * - Project Member: yes IF creator or assignee
 * - Non-member / other member: no
 */
export function canEditTask(
  actorOrgRole: Role,
  isProjectOwner: boolean,
  isTaskCreator: boolean,
  isTaskAssignee: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  if (isProjectOwner) {
    return true;
  }
  return isTaskCreator || isTaskAssignee;
}

/**
 * Checks if the actor can change task status alone.
 * - Org OWNER/ADMIN: yes
 * - Project Owner: yes
 * - Project Member: yes IF assignee or creator
 * - Other project members / non-members: no
 */
export function canChangeTaskStatus(
  actorOrgRole: Role,
  isProjectOwner: boolean,
  isTaskCreator: boolean,
  isTaskAssignee: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  if (isProjectOwner) {
    return true;
  }
  return isTaskAssignee || isTaskCreator;
}

/**
 * Checks if the actor can reassign a task.
 * Per Day 3 default specification: ANY project member or project owner or org admin can reassign.
 * - Org OWNER/ADMIN: yes
 * - Project Owner / Project Member: yes
 * - Non-project member: no
 */
export function canReassignTask(
  actorOrgRole: Role,
  isProjectMemberOrOwner: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  return isProjectMemberOrOwner;
}

/**
 * Checks if the actor can delete a task.
 * - Org OWNER/ADMIN: yes
 * - Project Owner: yes
 * - Project Member: yes IF creator
 * - Assignee (who is not creator): no
 * - Non-project member: no
 */
export function canDeleteTask(
  actorOrgRole: Role,
  isProjectOwner: boolean,
  isTaskCreator: boolean
): boolean {
  if (actorOrgRole === "OWNER" || actorOrgRole === "ADMIN") {
    return true;
  }
  if (isProjectOwner) {
    return true;
  }
  return isTaskCreator;
}
