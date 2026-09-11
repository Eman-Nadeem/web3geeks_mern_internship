/**
 * Single source of truth for Role-Based Collaboration Permissions (Day 4).
 * Used across both backend API/WebSocket handlers and frontend UI components.
 */

export const Role = {
  OWNER: "OWNER",
  EDITOR: "EDITOR",
  VIEWER: "VIEWER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export type PermissionAction =
  | "view_document"
  | "edit_document"
  | "see_presence"
  | "see_cursors"
  | "share_document"
  | "change_roles"
  | "remove_collaborator"
  | "restore_version"
  | "view_version_history";

/**
 * Shared Permissions Matrix between Frontend and Backend.
 * Ensures rules cannot silently drift apart.
 */
export const PERMISSION_MATRIX: Record<Role, Record<PermissionAction, boolean>> = {
  OWNER: {
    view_document: true,
    edit_document: true,
    see_presence: true,
    see_cursors: true,
    share_document: true,
    change_roles: true,
    remove_collaborator: true,
    restore_version: true,
    view_version_history: true,
  },
  EDITOR: {
    view_document: true,
    edit_document: true,
    see_presence: true,
    see_cursors: true,
    share_document: false,
    change_roles: false,
    remove_collaborator: false,
    restore_version: true,
    view_version_history: true,
  },
  VIEWER: {
    view_document: true,
    edit_document: false,
    see_presence: true,
    see_cursors: true,
    share_document: false,
    change_roles: false,
    remove_collaborator: false,
    restore_version: false,
    view_version_history: true,
  },
};

/**
 * Normalizes case-insensitive role string ("owner" -> "OWNER", "viewer" -> "VIEWER")
 */
export function normalizeRole(role?: string | null): Role | null {
  if (!role) return null;
  const upper = role.toUpperCase();
  if (upper === "OWNER" || upper === "EDITOR" || upper === "VIEWER") {
    return upper as Role;
  }
  return null;
}

/**
 * Evaluates whether a given role has permission to execute an action.
 */
export function hasPermission(
  role: Role | string | undefined | null,
  action: PermissionAction
): boolean {
  const normalized = normalizeRole(role);
  if (!normalized) return false;
  return PERMISSION_MATRIX[normalized]?.[action] ?? false;
}
