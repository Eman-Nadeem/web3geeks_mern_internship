import { describe, it, expect } from "vitest";
import { normalizeHtml } from "@/components/editor/tiptap-editor";
import { updateDocumentSchema } from "@/lib/validation/document";
import { VALID_STATUSES, VALID_CATEGORIES } from "@/lib/db/documents";

describe("Bug 1: Heading Formatting Boundary & HTML Normalization", () => {
  it("should split multiple lines with newlines into discrete <p> blocks", () => {
    const raw = "Line 1\nLine 2\nLine 3";
    const normalized = normalizeHtml(raw);
    expect(normalized).toBe("<p>Line 1</p><p>Line 2</p><p>Line 3</p>");
  });

  it("should convert soft <br> tags inside paragraphs into discrete <p> blocks", () => {
    const inputWithBr = "<p>Line 1<br>Line 2<br/>Line 3</p>";
    const normalized = normalizeHtml(inputWithBr);
    expect(normalized).toBe("<p>Line 1</p><p>Line 2</p><p>Line 3</p>");
  });

  it("should convert internal raw newlines within HTML into discrete <p> blocks", () => {
    const inputWithNewlines = "<p>Line 1\nLine 2\nLine 3</p>";
    const normalized = normalizeHtml(inputWithNewlines);
    expect(normalized).toBe("<p>Line 1</p><p>Line 2</p><p>Line 3</p>");
  });

  it("should preserve existing well-formed heading and paragraph blocks", () => {
    const input = "<h1>Heading 1</h1><p>Line 2</p>";
    const normalized = normalizeHtml(input);
    expect(normalized).toBe("<h1>Heading 1</h1><p>Line 2</p>");
  });

  it("should handle empty or whitespace-only input gracefully", () => {
    expect(normalizeHtml("")).toBe("<p></p>");
    expect(normalizeHtml("   ")).toBe("<p></p>");
  });
});

describe("Bug 3: Status and Category Schema Validation", () => {
  it("should accept valid status and category in updateDocumentSchema", () => {
    const validPayload = {
      title: "Architecture Spec",
      status: "In Review",
      category: "Engineering",
    };
    const result = updateDocumentSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("should reject invalid status values", () => {
    const invalidPayload = {
      status: "Archived", // Not in ["Draft", "In Review", "Complete"]
    };
    const result = updateDocumentSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("should reject invalid category values", () => {
    const invalidPayload = {
      category: "RandomCategory",
    };
    const result = updateDocumentSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it("should include all documented statuses and categories", () => {
    expect(VALID_STATUSES).toContain("Draft");
    expect(VALID_STATUSES).toContain("In Review");
    expect(VALID_STATUSES).toContain("Complete");

    expect(VALID_CATEGORIES).toContain("Product");
    expect(VALID_CATEGORIES).toContain("Engineering");
    expect(VALID_CATEGORIES).toContain("Design");
    expect(VALID_CATEGORIES).toContain("Marketing");
  });
});
