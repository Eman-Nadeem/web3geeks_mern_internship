import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  ensureDemoUser,
} from "../lib/db/documents";

describe("Priority 1 — Data Loss: Dual-Persistence Race Condition Test", () => {
  const ownerId = "user_demo_123";
  let documentId: string;

  beforeAll(async () => {
    await ensureDemoUser();
    // Create initial document at version 1
    const doc = await createDocument(ownerId, {
      title: "Dual Persistence Concurrency Test",
      content: "<p>Original Content v1</p>",
    });
    documentId = doc.id;
  });

  afterAll(async () => {
    if (documentId) {
      await deleteDocument(documentId, ownerId);
    }
  });

  it("should prevent stale HTTP autosave from overwriting a more recent socket-resolved edit", async () => {
    // Both Session A and Session B initially read the document at version 1
    const initialDoc = await getDocumentById(documentId);
    expect(initialDoc).toBeDefined();
    const sessionABaseVersion = initialDoc!.version; // v1
    const sessionBBaseVersion = initialDoc!.version; // v1

    expect(sessionABaseVersion).toBe(1);
    expect(sessionBBaseVersion).toBe(1);

    // 1. Session A makes a live edit via WebSocket path (simulated by LWW update with new version)
    // Socket server increments version to 2 and persists Session A's winner content
    const socketLwwResult = await updateDocument(documentId, ownerId, {
      content: "<p>Session A Winning Socket Edit</p>",
      version: 2,
    });
    expect(socketLwwResult.success).toBe(true);

    const docAfterSocketEdit = await getDocumentById(documentId);
    expect(docAfterSocketEdit?.version).toBe(2);
    expect(docAfterSocketEdit?.content).toBe("<p>Session A Winning Socket Edit</p>");

    // 2. Session B's delayed HTTP autosave fires with stale baseVersion: 1
    // Content is Session B's old offline/stale state
    const staleHttpAutosaveResult = await updateDocument(documentId, ownerId, {
      content: "<p>Session B Stale Overwrite Attempt</p>",
      baseVersion: sessionBBaseVersion, // 1 < 2!
    });

    // 3. Assert HTTP update was REJECTED with 409 Conflict
    expect(staleHttpAutosaveResult.success).toBe(false);
    if (!staleHttpAutosaveResult.success) {
      expect(staleHttpAutosaveResult.status).toBe(409);
      expect(staleHttpAutosaveResult.error).toContain("Conflict");
      expect(staleHttpAutosaveResult.currentVersion).toBe(2);
      expect(staleHttpAutosaveResult.content).toBe("<p>Session A Winning Socket Edit</p>");
    }

    // 4. Assert the database STILL holds Session A's winner content (not overwritten)
    const finalDoc = await getDocumentById(documentId);
    expect(finalDoc?.content).toBe("<p>Session A Winning Socket Edit</p>");
    expect(finalDoc?.version).toBe(2);
  });
});
