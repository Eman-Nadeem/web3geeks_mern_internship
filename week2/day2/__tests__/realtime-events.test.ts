import { describe, it, expect } from "vitest";
import {
  joinDocumentSchema,
  leaveDocumentSchema,
  documentChangeSchema,
  collaboratorSchema,
  getDocumentRoom,
} from "../lib/realtime/events";

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
});
