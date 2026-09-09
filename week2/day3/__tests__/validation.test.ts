import { describe, it, expect } from "vitest";
import {
  createDocumentSchema,
  updateDocumentSchema,
  documentIdSchema,
} from "../lib/validation/document";

describe("Document Input Validation Schemas", () => {
  describe("createDocumentSchema", () => {
    it("should accept empty payload and apply defaults", () => {
      const result = createDocumentSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Untitled Document");
        expect(result.data.content).toBe("<p>Start typing your document here...</p>");
      }
    });

    it("should accept custom title and content", () => {
      const input = {
        title: "Architecture Specs",
        content: "<h2>Next.js 15+ System</h2>",
      };
      const result = createDocumentSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Architecture Specs");
        expect(result.data.content).toBe("<h2>Next.js 15+ System</h2>");
      }
    });

    it("should reject titles exceeding 255 characters", () => {
      const longTitle = "a".repeat(256);
      const result = createDocumentSchema.safeParse({ title: longTitle });
      expect(result.success).toBe(false);
    });
  });

  describe("updateDocumentSchema", () => {
    it("should validate partial updates for title", () => {
      const result = updateDocumentSchema.safeParse({ title: "Renamed Title" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Renamed Title");
        expect(result.data.content).toBeUndefined();
      }
    });

    it("should validate partial updates for content", () => {
      const result = updateDocumentSchema.safeParse({
        content: "<p>Updated paragraph</p>",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe("<p>Updated paragraph</p>");
      }
    });

    it("should reject overly long title in update payload", () => {
      const result = updateDocumentSchema.safeParse({
        title: "x".repeat(300),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("documentIdSchema", () => {
    it("should reject empty ID string", () => {
      const result = documentIdSchema.safeParse({ id: "" });
      expect(result.success).toBe(false);
    });

    it("should accept non-empty string ID", () => {
      const result = documentIdSchema.safeParse({ id: "doc_12345" });
      expect(result.success).toBe(true);
    });
  });
});
