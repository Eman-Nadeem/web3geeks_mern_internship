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

/**
 * Returns canonical room name for a document.
 */
export function getDocumentRoom(documentId: string): string {
  return `document:${documentId}`;
}
