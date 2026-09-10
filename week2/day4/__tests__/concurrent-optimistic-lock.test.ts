import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createDocument,
  getDocumentById,
  updateDocument,
  deleteDocument,
  ensureDemoUser,
} from "../lib/db/documents";

describe("CRITICAL 4 — Atomic Optimistic Concurrency Race Condition Test", () => {
  const ownerId = "user_demo_123";
  let documentId: string;

  beforeAll(async () => {
    await ensureDemoUser();
  });

  afterAll(async () => {
    if (documentId) {
      await deleteDocument(documentId, ownerId).catch(() => null);
    }
  });

  it("fires two concurrent updateDocument calls with the SAME baseVersion and ensures exactly ONE succeeds and the OTHER receives 409", async () => {
    // 1. Create a fresh test document (version defaults to 1)
    const doc = await createDocument(ownerId, {
      title: "Concurrent Race Test Doc",
      content: "<p>Initial Content v1</p>",
    });
    documentId = doc.id;

    const initialDoc = await getDocumentById(documentId);
    expect(initialDoc).toBeDefined();
    const staleBaseVersion = initialDoc!.version;
    expect(staleBaseVersion).toBe(1);

    // 2. Fire two concurrent updateDocument() calls with the EXACT SAME baseVersion (1)
    // In the original vulnerable read-then-write implementation, both findUnique() calls read version 1,
    // both 1 < 1 checks evaluate to false, and both updates succeed without either getting 409.
    // In our atomic updateMany implementation, database row locking ensures exactly one succeeds
    // and the second sees version mismatch and receives 409.
    const [res1, res2] = await Promise.all([
      updateDocument(documentId, ownerId, {
        content: "<p>Concurrent Candidate A</p>",
        baseVersion: staleBaseVersion,
      }),
      updateDocument(documentId, ownerId, {
        content: "<p>Concurrent Candidate B</p>",
        baseVersion: staleBaseVersion,
      }),
    ]);

    const results = [res1, res2];
    const successes = results.filter((r) => r.success === true);
    const conflicts = results.filter((r) => r.success === false && r.status === 409);

    // Exactly one must succeed
    expect(successes).toHaveLength(1);
    // Exactly one must fail with 409 Conflict
    expect(conflicts).toHaveLength(1);

    const conflictResult = conflicts[0];
    if (!conflictResult.success) {
      expect(conflictResult.status).toBe(409);
      expect(conflictResult.error).toContain("Conflict");
      expect(conflictResult.currentVersion).toBe(2);
    }

    // Verify final state in database has version 2
    const finalDoc = await getDocumentById(documentId);
    expect(finalDoc?.version).toBe(2);
  });
});
