import { z } from "zod";

// --- Event Names ---
export const REALTIME_EVENTS = {
  JOIN_DOCUMENT: "join_document",
  LEAVE_DOCUMENT: "leave_document",
  DOCUMENT_CHANGE: "document_change",
  DOCUMENT_UPDATE: "document_update",
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  ROOM_USERS: "room_users",
  PRESENCE_UPDATE: "presence_update",
  CURSOR_UPDATE: "cursor_update",
  SYNC_REQUEST: "sync_request",
  SYNC_RESPONSE: "sync_response",
  PING: "ping",
  PONG: "pong",
  ERROR: "error",
  // Day 4 Events
  PERMISSION_UPDATE: "permission_update",
  COLLABORATOR_ADDED: "collaborator_added",
  COLLABORATOR_REMOVED: "collaborator_removed",
  ROLE_CHANGED: "role_changed",
  VERSION_CREATED: "version_created",
  DOCUMENT_RESTORED: "document_restored",
} as const;

// --- Zod Payloads ---
export const joinDocumentSchema = z.object({
  documentId: z.string().min(1, { message: "Document ID is required" }),
});

export const leaveDocumentSchema = z.object({
  documentId: z.string().min(1, { message: "Document ID is required" }),
});

export const documentChangeSchema = z.object({
  documentId: z.string().min(1, { message: "Document ID is required" }),
  title: z.string().max(255).optional(),
  content: z.string().optional(),
  jsonContent: z.string().optional().nullable(),
  status: z.string().optional(),
  category: z.string().optional(),
  baseVersion: z.number().int().nonnegative().optional(),
  updatedAt: z.string().optional(),
});

export const collaboratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional().nullable(),
  color: z.string().optional(),
});

export const documentUpdateSchema = z.object({
  documentId: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  jsonContent: z.string().optional().nullable(),
  status: z.string().optional(),
  category: z.string().optional(),
  version: z.number().int().nonnegative().optional(),
  updatedBy: collaboratorSchema,
  updatedAt: z.string(),
});

export const userJoinedSchema = z.object({
  documentId: z.string(),
  user: collaboratorSchema,
  activeUsers: z.array(collaboratorSchema).optional(),
});

export const userLeftSchema = z.object({
  documentId: z.string(),
  user: collaboratorSchema,
  activeUsers: z.array(collaboratorSchema).optional(),
});

// --- Day 3 Presence, Cursor, & Sync Schemas ---
export const presenceUserSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  color: z.string(),
  avatarUrl: z.string().optional().nullable(),
  joinedAt: z.string(),
});

export const presenceUpdateSchema = z.object({
  documentId: z.string(),
  users: z.array(presenceUserSchema),
});

export const cursorPositionSchema = z.object({
  from: z.number(),
  to: z.number(),
});

export const cursorUpdateSchema = z.object({
  documentId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  color: z.string(),
  cursor: cursorPositionSchema.nullable().optional(),
});

export const syncRequestSchema = z.object({
  documentId: z.string().min(1),
});

export const syncResponseSchema = z.object({
  documentId: z.string(),
  content: z.string(),
  jsonContent: z.string().optional().nullable(),
  version: z.number().int().nonnegative(),
  presence: z.array(presenceUserSchema),
});

// --- Day 4 Sharing, Role & Version History Schemas ---
export const permissionUpdateSchema = z.object({
  documentId: z.string(),
  userId: z.string(),
  role: z.enum(["owner", "editor", "viewer", "none"]),
  revoked: z.boolean().optional(),
  message: z.string().optional(),
});

export const collaboratorAddedSchema = z.object({
  documentId: z.string(),
  collaborator: z.object({
    id: z.string(),
    userId: z.string(),
    role: z.enum(["editor", "viewer"]),
    user: collaboratorSchema,
    addedAt: z.string().optional(),
  }),
});

export const collaboratorRemovedSchema = z.object({
  documentId: z.string(),
  userId: z.string(),
  removedBy: z.string().optional(),
});

export const roleChangedSchema = z.object({
  documentId: z.string(),
  userId: z.string(),
  newRole: z.enum(["editor", "viewer"]),
  changedBy: z.string().optional(),
});

export const versionCreatedSchema = z.object({
  documentId: z.string(),
  versionNumber: z.number().int().positive(),
  title: z.string(),
  changedBy: collaboratorSchema,
  createdAt: z.string(),
});

export const documentRestoredSchema = z.object({
  documentId: z.string(),
  version: z.number().int().positive(),
  restoredFromVersion: z.number().int().positive(),
  title: z.string(),
  content: z.string(),
  jsonContent: z.string().optional().nullable(),
  restoredBy: collaboratorSchema,
  restoredAt: z.string(),
});

// --- TypeScript Types Inferred from Zod ---
export type JoinDocumentPayload = z.infer<typeof joinDocumentSchema>;
export type LeaveDocumentPayload = z.infer<typeof leaveDocumentSchema>;
export type DocumentChangePayload = z.infer<typeof documentChangeSchema>;
export type DocumentUpdatePayload = z.infer<typeof documentUpdateSchema>;
export type Collaborator = z.infer<typeof collaboratorSchema>;
export type UserJoinedPayload = z.infer<typeof userJoinedSchema>;
export type UserLeftPayload = z.infer<typeof userLeftSchema>;
export type PresenceUser = z.infer<typeof presenceUserSchema>;
export type PresenceUpdatePayload = z.infer<typeof presenceUpdateSchema>;
export type CursorPosition = z.infer<typeof cursorPositionSchema>;
export type CursorUpdatePayload = z.infer<typeof cursorUpdateSchema>;
export type SyncRequestPayload = z.infer<typeof syncRequestSchema>;
export type SyncResponsePayload = z.infer<typeof syncResponseSchema>;

export type PermissionUpdatePayload = z.infer<typeof permissionUpdateSchema>;
export type CollaboratorAddedPayload = z.infer<typeof collaboratorAddedSchema>;
export type CollaboratorRemovedPayload = z.infer<typeof collaboratorRemovedSchema>;
export type RoleChangedPayload = z.infer<typeof roleChangedSchema>;
export type VersionCreatedPayload = z.infer<typeof versionCreatedSchema>;
export type DocumentRestoredPayload = z.infer<typeof documentRestoredSchema>;

/**
 * Returns canonical room name for a document.
 */
export function getDocumentRoom(documentId: string): string {
  return `document:${documentId}`;
}

