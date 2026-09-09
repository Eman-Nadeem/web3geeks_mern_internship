import { describe, it, expect } from "vitest";
import {
  createDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  ensureDemoUser,
} from "../lib/db/documents";

describe("Document CRUD & Ownership Layer", () => {
  let testDocId: string;
  const ownerA = "user_demo_123";
  const userB = "user_unauthorized_456";

  it("should ensure demo user exists", async () => {
    const user = await ensureDemoUser();
    expect(user).toBeDefined();
    expect(user.id).toBe(ownerA);
  });

  it("should create a new document with default values for ownerA", async () => {
    const doc = await createDocument(ownerA, {
      title: "Test Unit Document",
      content: "<p>Unit Test Content</p>",
    });

    expect(doc).toBeDefined();
    expect(doc.id).toBeDefined();
    expect(doc.title).toBe("Test Unit Document");
    expect(doc.content).toBe("<p>Unit Test Content</p>");
    expect(doc.ownerId).toBe(ownerA);

    testDocId = doc.id;
  });

  it("should fetch created document by ID", async () => {
    const fetched = await getDocumentById(testDocId);
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe(testDocId);
    expect(fetched?.title).toBe("Test Unit Document");
    expect(fetched?.ownerId).toBe(ownerA);
  });

  it("should return null for non-existent document ID", async () => {
    const nonExistent = await getDocumentById("invalid_id_999");
    expect(nonExistent).toBeNull();
  });

  it("should list all documents for ownerA", async () => {
    const all = await getAllDocuments(ownerA);
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
    const found = all.find((d) => d.id === testDocId);
    expect(found).toBeDefined();
  });

  it("should update document title and content when called by ownerA", async () => {
    const res = await updateDocument(testDocId, ownerA, {
      title: "Updated Unit Title",
      content: "<p>Updated Content</p>",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.title).toBe("Updated Unit Title");
      expect(res.data.content).toBe("<p>Updated Content</p>");
    }
  });

  it("should reject update attempts by userB with 403 Forbidden", async () => {
    const res = await updateDocument(testDocId, userB, {
      title: "Hacked Title",
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.status).toBe(403);
    }
  });

  it("should reject delete attempts by userB with 403 Forbidden", async () => {
    const res = await deleteDocument(testDocId, userB);

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.status).toBe(403);
    }
  });

  it("should delete created document when called by ownerA", async () => {
    const res = await deleteDocument(testDocId, ownerA);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.id).toBe(testDocId);
    }

    const check = await getDocumentById(testDocId);
    expect(check).toBeNull();
  });
});
