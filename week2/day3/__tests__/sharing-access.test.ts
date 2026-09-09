import { describe, it, expect, beforeAll } from "vitest";
import {
  createDocument,
  getUserDocumentAccess,
  getAllDocuments,
  addDocumentCollaborator,
  updateCollaboratorRole,
  removeDocumentCollaborator,
  updateDocument,
  deleteDocument,
  ensureDemoUser,
} from "../lib/db/documents";
import { prisma } from "../lib/db/prisma";

describe("Document Sharing & Multi-User Access Control Integration Tests", () => {
  const ownerId = "user_demo_123";
  let userEditorId: string;
  let testDocumentId: string;

  beforeAll(async () => {
    await ensureDemoUser();

    // Ensure a second user exists for collaboration tests
    const userEditor = await prisma.user.upsert({
      where: { email: "colleague_test@example.com" },
      update: {},
      create: {
        email: "colleague_test@example.com",
        name: "Colleague Test",
        password: "Password123!",
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Colleague",
      },
    });
    userEditorId = userEditor.id;

    // Create a fresh test document
    const doc = await createDocument(ownerId, {
      title: "Shared Access Test Doc",
      content: "<p>Original Content by Owner</p>",
    });
    testDocumentId = doc.id;
  });

  it("should recognize creator as 'owner'", async () => {
    const access = await getUserDocumentAccess(ownerId, testDocumentId);
    expect(access).toBe("owner");
  });

  it("should return 'none' access for uninvited user", async () => {
    const access = await getUserDocumentAccess(userEditorId, testDocumentId);
    expect(access).toBe("none");
  });

  it("should allow owner to invite user as 'editor'", async () => {
    const res = await addDocumentCollaborator(
      testDocumentId,
      "colleague_test@example.com",
      "editor",
      ownerId
    );

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.userId).toBe(userEditorId);
      expect(res.data.role).toBe("editor");
    }

    const access = await getUserDocumentAccess(userEditorId, testDocumentId);
    expect(access).toBe("editor");
  });

  it("should allow 'editor' to update document content", async () => {
    const res = await updateDocument(testDocumentId, userEditorId, {
      content: "<p>Updated Content by Editor</p>",
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.content).toBe("<p>Updated Content by Editor</p>");
    }
  });

  it("should reject 'editor' attempting to delete document with 403", async () => {
    const res = await deleteDocument(testDocumentId, userEditorId);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.status).toBe(403);
    }
  });

  it("should include shared document in editor's document list", async () => {
    const docs = await getAllDocuments(userEditorId);
    const found = docs.find((d) => d.id === testDocumentId);
    expect(found).toBeDefined();
    expect(found?.accessRole).toBe("editor");
  });

  it("should allow owner to switch collaborator role to 'viewer'", async () => {
    const res = await updateCollaboratorRole(
      testDocumentId,
      userEditorId,
      "viewer",
      ownerId
    );

    expect(res.success).toBe(true);
    const access = await getUserDocumentAccess(userEditorId, testDocumentId);
    expect(access).toBe("viewer");
  });

  it("should reject 'viewer' attempting to update document with 403", async () => {
    const res = await updateDocument(testDocumentId, userEditorId, {
      title: "Viewer Hacked Title",
    });

    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.status).toBe(403);
      expect(res.error).toContain("Viewers have read-only access");
    }
  });

  it("should allow owner to remove collaborator and revoke access", async () => {
    const res = await removeDocumentCollaborator(
      testDocumentId,
      userEditorId,
      ownerId
    );

    expect(res.success).toBe(true);

    const access = await getUserDocumentAccess(userEditorId, testDocumentId);
    expect(access).toBe("none");
  });

  it("should allow owner to delete document", async () => {
    const res = await deleteDocument(testDocumentId, ownerId);
    expect(res.success).toBe(true);
  });
});
