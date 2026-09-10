import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db/prisma";
import {
  createDocument,
  getUserDocumentAccess,
  addDocumentCollaborator,
  updateCollaboratorRole,
  removeDocumentCollaborator,
  updateDocument,
  getDocumentVersions,
  getDocumentVersion,
  restoreDocumentVersion,
} from "../lib/db/documents";
import { hasPermission } from "../lib/auth/permissions";

describe("Day 4 — Sharing, Permissions & Version History Suite (Task 7 Scenario)", () => {
  let userAId: string;
  let userBId: string;
  let userCId: string;
  let userDId: string;
  let documentId: string;

  beforeAll(async () => {
    // 1. Seed test users
    const userA = await prisma.user.upsert({
      where: { email: "usera_day4@test.com" },
      update: {},
      create: {
        email: "usera_day4@test.com",
        name: "User A (Owner)",
        password: "Password123!",
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.upsert({
      where: { email: "userb_day4@test.com" },
      update: {},
      create: {
        email: "userb_day4@test.com",
        name: "User B (Editor)",
        password: "Password123!",
      },
    });
    userBId = userB.id;

    const userC = await prisma.user.upsert({
      where: { email: "userc_day4@test.com" },
      update: {},
      create: {
        email: "userc_day4@test.com",
        name: "User C (Viewer)",
        password: "Password123!",
      },
    });
    userCId = userC.id;

    const userD = await prisma.user.upsert({
      where: { email: "userd_day4@test.com" },
      update: {},
      create: {
        email: "userd_day4@test.com",
        name: "User D (Uninvited)",
        password: "Password123!",
      },
    });
    userDId = userD.id;
  });

  afterAll(async () => {
    // Cleanup created document and cascade versions/collaborators
    if (documentId) {
      await prisma.document.deleteMany({ where: { id: documentId } });
    }
  });

  describe("Permission Matrix Single Source of Truth", () => {
    it("enforces OWNER capabilities accurately", () => {
      expect(hasPermission("owner", "view_document")).toBe(true);
      expect(hasPermission("owner", "edit_document")).toBe(true);
      expect(hasPermission("owner", "share_document")).toBe(true);
      expect(hasPermission("owner", "change_roles")).toBe(true);
      expect(hasPermission("owner", "remove_collaborator")).toBe(true);
      expect(hasPermission("owner", "restore_version")).toBe(true);
      expect(hasPermission("owner", "view_version_history")).toBe(true);
    });

    it("enforces EDITOR capabilities accurately (cannot share or change roles)", () => {
      expect(hasPermission("editor", "view_document")).toBe(true);
      expect(hasPermission("editor", "edit_document")).toBe(true);
      expect(hasPermission("editor", "see_presence")).toBe(true);
      expect(hasPermission("editor", "see_cursors")).toBe(true);
      expect(hasPermission("editor", "share_document")).toBe(false);
      expect(hasPermission("editor", "change_roles")).toBe(false);
      expect(hasPermission("editor", "remove_collaborator")).toBe(false);
      expect(hasPermission("editor", "restore_version")).toBe(true);
      expect(hasPermission("editor", "view_version_history")).toBe(true);
    });

    it("enforces VIEWER capabilities accurately (read-only, no restore, no edit)", () => {
      expect(hasPermission("viewer", "view_document")).toBe(true);
      expect(hasPermission("viewer", "edit_document")).toBe(false);
      expect(hasPermission("viewer", "see_presence")).toBe(true);
      expect(hasPermission("viewer", "see_cursors")).toBe(true);
      expect(hasPermission("viewer", "share_document")).toBe(false);
      expect(hasPermission("viewer", "change_roles")).toBe(false);
      expect(hasPermission("viewer", "remove_collaborator")).toBe(false);
      expect(hasPermission("viewer", "restore_version")).toBe(false);
      expect(hasPermission("viewer", "view_version_history")).toBe(true);
    });

    it("rejects unauthorized role or none", () => {
      expect(hasPermission("none", "view_document")).toBe(false);
      expect(hasPermission(undefined, "edit_document")).toBe(false);
      expect(hasPermission(null, "view_document")).toBe(false);
    });

    it("is actively wired into runtime database service functions", async () => {
      const tempDoc = await createDocument(userAId, { title: "Wiring Check Doc" });
      try {
        // Viewer attempting edit exercises hasPermission(access, "edit_document")
        const editRes = await updateDocument(tempDoc.id, userCId, { content: "<p>Forbidden</p>" });
        expect(editRes.success).toBe(false);
        if (!editRes.success) {
          expect(editRes.status).toBe(403);
        }

        // Non-owner attempting share exercises hasPermission(access, "share_document")
        const shareRes = await addDocumentCollaborator(tempDoc.id, "userd_day4@test.com", "editor", userBId);
        expect(shareRes.success).toBe(false);
        if (!shareRes.success) {
          expect(shareRes.status).toBe(403);
        }
      } finally {
        await prisma.document.deleteMany({ where: { id: tempDoc.id } });
      }
    });
  });

  describe("Task 7 Multi-User Workflow Scenario", () => {
    it("Step 1: User A creates a document and initial version 1 snapshot is recorded", async () => {
      const doc = await createDocument(userAId, {
        title: "Sprint Retrospective Doc",
        content: "<p>Initial content by User A</p>",
      });

      expect(doc).toBeDefined();
      expect(doc.ownerId).toBe(userAId);
      expect(doc.version).toBe(1);
      documentId = doc.id;

      // Verify access role
      const access = await getUserDocumentAccess(userAId, documentId);
      expect(access).toBe("owner");

      // Verify initial version snapshot exists
      const versionsRes = await getDocumentVersions(documentId, userAId);
      expect(versionsRes.success).toBe(true);
      if (versionsRes.success) {
        expect(versionsRes.data.length).toBe(1);
        expect(versionsRes.data[0].versionNumber).toBe(1);
        expect(versionsRes.data[0].content).toBe("<p>Initial content by User A</p>");
        expect(versionsRes.data[0].changedById).toBe(userAId);
      }
    });

    it("Step 2: User A shares document with User B as Editor", async () => {
      const shareRes = await addDocumentCollaborator(
        documentId,
        "userb_day4@test.com",
        "editor",
        userAId
      );

      expect(shareRes.success).toBe(true);
      if (shareRes.success) {
        expect(shareRes.data.userId).toBe(userBId);
        expect(shareRes.data.role).toBe("editor");
      }

      const accessB = await getUserDocumentAccess(userBId, documentId);
      expect(accessB).toBe("editor");
    });

    it("Step 2b: Adding a non-existent user is rejected with 404", async () => {
      const res = await addDocumentCollaborator(
        documentId,
        "does_not_exist_404@example.com",
        "editor",
        userAId
      );
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(404);
        expect(res.error).toContain("No account found");
      }
    });

    it("Step 2c: Non-owner (User B) attempting to add collaborator is rejected with 403", async () => {
      const res = await addDocumentCollaborator(
        documentId,
        "userc_day4@test.com",
        "editor",
        userBId
      );
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.status).toBe(403);
        expect(res.error).toContain("Forbidden");
      }
    });

    it("Step 3: User A shares document with User C as Viewer", async () => {
      const shareRes = await addDocumentCollaborator(
        documentId,
        "userc_day4@test.com",
        "viewer",
        userAId
      );

      expect(shareRes.success).toBe(true);
      if (shareRes.success) {
        expect(shareRes.data.userId).toBe(userCId);
        expect(shareRes.data.role).toBe("viewer");
      }

      const accessC = await getUserDocumentAccess(userCId, documentId);
      expect(accessC).toBe("viewer");
    });

    it("Step 4: User B edits the document → successfully persists and records Version 2", async () => {
      const updateRes = await updateDocument(documentId, userBId, {
        content: "<p>Updated content by User B (Editor)</p>",
        version: 2,
      });

      expect(updateRes.success).toBe(true);
      if (updateRes.success) {
        expect(updateRes.data.content).toBe("<p>Updated content by User B (Editor)</p>");
        expect(updateRes.data.version).toBe(2);
      }

      // Verify Version 2 snapshot is written
      const versionsRes = await getDocumentVersions(documentId, userAId);
      expect(versionsRes.success).toBe(true);
      if (versionsRes.success) {
        expect(versionsRes.data.length).toBe(2);
        expect(versionsRes.data[0].versionNumber).toBe(2);
        expect(versionsRes.data[0].content).toBe("<p>Updated content by User B (Editor)</p>");
        expect(versionsRes.data[0].changedById).toBe(userBId);
      }
    });

    it("Step 5: User C (Viewer) attempts direct edit → rejected server-side with 403 Forbidden", async () => {
      const editAttempt = await updateDocument(documentId, userCId, {
        content: "<p>Malicious edit attempt by Viewer</p>",
      });

      expect(editAttempt.success).toBe(false);
      if (!editAttempt.success) {
        expect(editAttempt.status).toBe(403);
        expect(editAttempt.error).toContain("Viewers have read-only access");
      }

      // Verify content was not modified
      const currentDoc = await prisma.document.findUnique({ where: { id: documentId } });
      expect(currentDoc?.content).toBe("<p>Updated content by User B (Editor)</p>");
    });

    it("Step 6: User A changes User B's role to Viewer → User B immediately loses edit capability", async () => {
      // Owner changes User B to viewer
      const roleChangeRes = await updateCollaboratorRole(
        documentId,
        userBId,
        "viewer",
        userAId
      );
      expect(roleChangeRes.success).toBe(true);

      const accessB = await getUserDocumentAccess(userBId, documentId);
      expect(accessB).toBe("viewer");

      // User B attempts direct edit as a demoted viewer -> rejected with 403
      const directEditAttempt = await updateDocument(documentId, userBId, {
        content: "<p>User B trying to edit after demotion</p>",
      });

      expect(directEditAttempt.success).toBe(false);
      if (!directEditAttempt.success) {
        expect(directEditAttempt.status).toBe(403);
        expect(directEditAttempt.error).toContain("Viewers have read-only access");
      }
    });

    it("Step 7: User A restores older version (Version 1) → creates Version 3, preserves history", async () => {
      // User C (Viewer) attempting to restore is rejected with 403
      const viewerRestore = await restoreDocumentVersion(documentId, 1, userCId);
      expect(viewerRestore.success).toBe(false);
      if (!viewerRestore.success) {
        expect(viewerRestore.status).toBe(403);
        expect(viewerRestore.error).toContain("Viewers have read-only access");
      }

      // User A (Owner) restores Version 1
      const restoreRes = await restoreDocumentVersion(documentId, 1, userAId);
      expect(restoreRes.success).toBe(true);

      if (restoreRes.success) {
        const { document: restoredDoc, newVersion } = restoreRes.data;
        expect(restoredDoc.version).toBe(3);
        expect(restoredDoc.content).toBe("<p>Initial content by User A</p>");
        expect(newVersion.versionNumber).toBe(3);
        expect(newVersion.content).toBe("<p>Initial content by User A</p>");
      }

      // Verify full linear history is preserved (3 versions total: v3, v2, v1)
      const allVersions = await getDocumentVersions(documentId, userAId);
      expect(allVersions.success).toBe(true);
      if (allVersions.success) {
        expect(allVersions.data.length).toBe(3);
        expect(allVersions.data.map((v) => v.versionNumber)).toEqual([3, 2, 1]);
        // Historical v1 and v2 still intact
        const v2 = allVersions.data.find((v) => v.versionNumber === 2);
        expect(v2?.content).toBe("<p>Updated content by User B (Editor)</p>");
        const v1 = allVersions.data.find((v) => v.versionNumber === 1);
        expect(v1?.content).toBe("<p>Initial content by User A</p>");
      }
    });

    it("Step 8: Uninvited User D cannot access document at all", async () => {
      const accessD = await getUserDocumentAccess(userDId, documentId);
      expect(accessD).toBe("none");

      const versionsRes = await getDocumentVersions(documentId, userDId);
      expect(versionsRes.success).toBe(false);
      if (!versionsRes.success) {
        expect(versionsRes.status).toBe(403);
      }

      const singleVersionRes = await getDocumentVersion(documentId, 1, userDId);
      expect(singleVersionRes.success).toBe(false);
      if (!singleVersionRes.success) {
        expect(singleVersionRes.status).toBe(403);
      }

      const editRes = await updateDocument(documentId, userDId, {
        content: "<p>Uninvited User D trying to edit</p>",
      });
      expect(editRes.success).toBe(false);
      if (!editRes.success) {
        expect(editRes.status).toBe(403);
      }
    });

    it("Step 9: Owner removes User C → collaborator record deleted and access revoked immediately", async () => {
      const removeRes = await removeDocumentCollaborator(documentId, userCId, userAId);
      expect(removeRes.success).toBe(true);

      const accessC = await getUserDocumentAccess(userCId, documentId);
      expect(accessC).toBe("none");

      // User C can no longer view version history
      const versionsRes = await getDocumentVersions(documentId, userCId);
      expect(versionsRes.success).toBe(false);
      if (!versionsRes.success) {
        expect(versionsRes.status).toBe(403);
      }
    });
  });
});
