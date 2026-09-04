import React from 'react';

export type Role = 'SuperAdmin' | 'OrgAdmin' | 'ProjectManager' | 'TeamMember';

export type PermissionAction =
  | 'VIEW_SUPERADMIN_OVERVIEW'
  | 'MANAGE_ORGANIZATIONS'
  | 'VIEW_ALL_AUDIT_LOGS'
  | 'VIEW_TENANT_AUDIT_LOGS'
  | 'MANAGE_USERS' // Invite, role change, deactivate
  | 'CREATE_PROJECT'
  | 'EDIT_PROJECT'
  | 'ARCHIVE_PROJECT'
  | 'VIEW_PROJECTS'
  | 'CREATE_TASK'
  | 'EDIT_TASK_DETAILS'
  | 'REASSIGN_TASK'
  | 'DELETE_TASK'
  | 'UPDATE_OWN_TASK_STATUS'
  | 'VIEW_TASKS_BOARD'
  | 'MANAGE_TEAMS'
  | 'VIEW_TEAMS'
  | 'VIEW_NOTIFICATIONS';

/**
 * Client-side Role-Based Access Control matrix sourced 1:1 from roles_permission_matrix.md
 */
export const ROLE_PERMISSIONS_MATRIX: Record<Role, PermissionAction[]> = {
  SuperAdmin: [
    'VIEW_SUPERADMIN_OVERVIEW',
    'MANAGE_ORGANIZATIONS',
    'VIEW_ALL_AUDIT_LOGS',
    'VIEW_NOTIFICATIONS',
    'VIEW_PROJECTS',
    'VIEW_TASKS_BOARD',
    'VIEW_TEAMS',
  ],
  OrgAdmin: [
    'MANAGE_USERS',
    'CREATE_PROJECT',
    'EDIT_PROJECT',
    'ARCHIVE_PROJECT',
    'VIEW_PROJECTS',
    'CREATE_TASK',
    'EDIT_TASK_DETAILS',
    'REASSIGN_TASK',
    'DELETE_TASK',
    'UPDATE_OWN_TASK_STATUS',
    'VIEW_TASKS_BOARD',
    'MANAGE_TEAMS',
    'VIEW_TEAMS',
    'VIEW_TENANT_AUDIT_LOGS',
    'VIEW_NOTIFICATIONS',
  ],
  ProjectManager: [
    'CREATE_PROJECT',
    'EDIT_PROJECT',
    'ARCHIVE_PROJECT',
    'VIEW_PROJECTS',
    'CREATE_TASK',
    'EDIT_TASK_DETAILS',
    'REASSIGN_TASK',
    'DELETE_TASK',
    'UPDATE_OWN_TASK_STATUS',
    'VIEW_TASKS_BOARD',
    'MANAGE_TEAMS',
    'VIEW_TEAMS',
    'VIEW_NOTIFICATIONS',
  ],
  TeamMember: [
    'VIEW_PROJECTS',
    'UPDATE_OWN_TASK_STATUS',
    'VIEW_TASKS_BOARD',
    'VIEW_TEAMS',
    'VIEW_NOTIFICATIONS',
  ],
};

/**
 * Utility to check if a user role possesses permission for an action.
 */
export function can(role?: Role | string | null, action?: PermissionAction): boolean {
  if (!role || !action) return false;
  const userRole = role as Role;
  const permissions = ROLE_PERMISSIONS_MATRIX[userRole];
  if (!permissions) return false;
  return permissions.includes(action);
}

interface RoleGateProps {
  role?: Role | string | null;
  allow: PermissionAction | PermissionAction[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Declarative component for role-gated UI elements
 */
export function RoleGate({ role, allow, children, fallback = null }: RoleGateProps) {
  const actions = Array.isArray(allow) ? allow : [allow];
  const isAllowed = actions.some((act) => can(role, act));
  return (isAllowed ? children : fallback) as React.ReactElement | null;
}
