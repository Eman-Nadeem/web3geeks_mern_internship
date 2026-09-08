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
  updatedAt: z.string().optional(),
});

export const collaboratorSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional().nullable(),
});

export const documentUpdateSchema = z.object({
  documentId: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  jsonContent: z.string().optional().nullable(),
  status: z.string().optional(),
  category: z.string().optional(),
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

// --- TypeScript Types Inferred from Zod ---
export type JoinDocumentPayload = z.infer<typeof joinDocumentSchema>;
export type LeaveDocumentPayload = z.infer<typeof leaveDocumentSchema>;
export type DocumentChangePayload = z.infer<typeof documentChangeSchema>;
export type DocumentUpdatePayload = z.infer<typeof documentUpdateSchema>;
export type Collaborator = z.infer<typeof collaboratorSchema>;
export type UserJoinedPayload = z.infer<typeof userJoinedSchema>;
export type UserLeftPayload = z.infer<typeof userLeftSchema>;

/**
 * Returns canonical room name for a document.
 */
export function getDocumentRoom(documentId: string): string {
  return `document:${documentId}`;
}
