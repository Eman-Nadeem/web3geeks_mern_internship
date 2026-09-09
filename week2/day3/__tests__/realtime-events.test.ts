import { describe, it, expect } from "vitest";
import {
  joinDocumentSchema,
  leaveDocumentSchema,
  documentChangeSchema,
  collaboratorSchema,
  presenceUserSchema,
  cursorUpdateSchema,
  syncRequestSchema,
  syncResponseSchema,
  getDocumentRoom,
} from "../lib/realtime/events";
import { getUserColor, COLLABORATOR_PALETTE } from "../lib/realtime/colors";

describe("Real-time Collaboration Event Contracts (Zod)", () => {
  describe("Room Naming Convention", () => {
    it("should generate canonical room string", () => {
      expect(getDocumentRoom("doc_abc123")).toBe("document:doc_abc123");
    });
  });

  describe("joinDocumentSchema", () => {
    it("should accept valid document ID", () => {
      const result = joinDocumentSchema.safeParse({ documentId: "doc_123" });
      expect(result.success).toBe(true);
    });

    it("should reject empty document ID", () => {
      const result = joinDocumentSchema.safeParse({ documentId: "" });
      expect(result.success).toBe(false);
    });

    it("should reject missing document ID", () => {
      const result = joinDocumentSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("leaveDocumentSchema", () => {
    it("should accept valid document ID", () => {
      const result = leaveDocumentSchema.safeParse({ documentId: "doc_123" });
      expect(result.success).toBe(true);
    });
  });

  describe("documentChangeSchema", () => {
    it("should accept valid content change", () => {
      const result = documentChangeSchema.safeParse({
        documentId: "doc_123",
        title: "Sprint Specs",
        content: "<p>Live debounced text</p>",
        jsonContent: JSON.stringify({ type: "doc" }),
      });
      expect(result.success).toBe(true);
    });

    it("should reject title exceeding 255 characters", () => {
      const result = documentChangeSchema.safeParse({
        documentId: "doc_123",
        title: "a".repeat(256),
      });
      expect(result.success).toBe(false);
    });

    it("should reject payload without documentId", () => {
      const result = documentChangeSchema.safeParse({
        content: "<p>orphan content</p>",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("collaboratorSchema", () => {
    it("should validate collaborator details", () => {
      const result = collaboratorSchema.safeParse({
        id: "usr_1",
        name: "Alex Rivera",
        email: "alex@example.com",
        avatarUrl: "https://example.com/avatar.png",
      });
      expect(result.success).toBe(true);
    });

    it("should accept collaborator with null avatarUrl", () => {
      const result = collaboratorSchema.safeParse({
        id: "usr_2",
        name: "Sarah Jenkins",
        avatarUrl: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("Day 3 Presence, Cursor & Sync Schemas", () => {
    it("should validate presenceUserSchema", () => {
      const valid = presenceUserSchema.safeParse({
        userId: "u123",
        displayName: "Ada Lovelace",
        color: "#2563EB",
        joinedAt: new Date().toISOString(),
      });
      expect(valid.success).toBe(true);
    });

    it("should validate cursorUpdateSchema with position range", () => {
      const valid = cursorUpdateSchema.safeParse({
        documentId: "doc_1",
        userId: "u123",
        displayName: "Ada Lovelace",
        color: "#2563EB",
        cursor: { from: 10, to: 25 },
      });
      expect(valid.success).toBe(true);
    });

    it("should validate cursorUpdateSchema with null cursor (unfocused/left)", () => {
      const valid = cursorUpdateSchema.safeParse({
        documentId: "doc_1",
        userId: "u123",
        displayName: "Ada Lovelace",
        color: "#2563EB",
        cursor: null,
      });
      expect(valid.success).toBe(true);
    });

    it("should validate syncRequestSchema", () => {
      expect(syncRequestSchema.safeParse({ documentId: "doc_1" }).success).toBe(true);
      expect(syncRequestSchema.safeParse({ documentId: "" }).success).toBe(false);
    });

    it("should validate syncResponseSchema", () => {
      const valid = syncResponseSchema.safeParse({
        documentId: "doc_1",
        content: "<p>Hello</p>",
        jsonContent: null,
        version: 3,
        presence: [
          {
            userId: "u1",
            displayName: "User 1",
            color: "#2563EB",
            joinedAt: new Date().toISOString(),
          },
        ],
      });
      expect(valid.success).toBe(true);
    });

    it("should assign deterministic colors via getUserColor", () => {
      const color1 = getUserColor("user_abc_123");
      const color2 = getUserColor("user_abc_123");
      expect(color1).toBe(color2);
      expect(COLLABORATOR_PALETTE).toContain(color1);

      // Verify fallback on empty
      expect(getUserColor("")).toBe(COLLABORATOR_PALETTE[0]);
    });
  });
});
