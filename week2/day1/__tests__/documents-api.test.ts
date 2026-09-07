import { describe, it, expect } from "vitest";
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
} from "../lib/db/documents";

describe("Document CRUD Operations Layer", () => {
  let testDocId: string;

  it("should create a new document with default values", async () => {
    const doc = await createDocument("user_demo_123", {
      title: "Test Unit Document",
      content: "<p>Unit Test Content</p>",
    });

    expect(doc).toBeDefined();
    expect(doc.id).toBeDefined();
    expect(doc.title).toBe("Test Unit Document");
    expect(doc.content).toBe("<p>Unit Test Content</p>");
    expect(doc.ownerId).toBe("user_demo_123");

    testDocId = doc.id;
  });

  it("should fetch created document by ID", async () => {
    const fetched = await getDocumentById(testDocId, "user_demo_123");
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(testDocId);
    expect(fetched?.title).toBe("Test Unit Document");
  });

  it("should return null for non-existent document ID", async () => {
    const nonExistent = await getDocumentById("invalid_id_999", "user_demo_123");
    expect(nonExistent).toBeNull();
  });

  it("should list all documents for owner", async () => {
    const all = await getAllDocuments("user_demo_123");
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
    const found = all.find((d) => d.id === testDocId);
    expect(found).toBeDefined();
  });

  it("should update document title and content", async () => {
    const updated = await updateDocument(testDocId, "user_demo_123", {
      title: "Updated Unit Title",
      content: "<p>Updated Content</p>",
    });

    expect(updated).toBeDefined();
    expect(updated?.title).toBe("Updated Unit Title");
    expect(updated?.content).toBe("<p>Updated Content</p>");
  });

  it("should delete created document", async () => {
    const deleted = await deleteDocument(testDocId, "user_demo_123");
    expect(deleted).toBeDefined();
    expect(deleted?.id).toBe(testDocId);

    const check = await getDocumentById(testDocId, "user_demo_123");
    expect(check).toBeNull();
  });
});
