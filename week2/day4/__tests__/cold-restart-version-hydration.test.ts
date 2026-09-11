import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../lib/db/prisma";
import {
  documentVersions,
  documentContents,
  ensureDocumentHydrated,
  incrementDocumentVersion,
  getDocumentVersion,
} from "../server/socket";
import { updateDocument } from "../lib/db/documents";

describe("Cold-Restart In-Memory Version Hydration Suite (Day 3 & Day 4 Remediation)", () => {
  let testUserId: string;
  let testDocId: string;

  beforeAll(async () => {
    // 1. Create test user
    const user = await prisma.user.upsert({
      where: { email: "hydration_tester@example.com" },
      update: {},
      create: {
        email: "hydration_tester@example.com",
        name: "Hydration Tester",
        password: "Password123!",
      },
    });
    testUserId = user.id;

    // 2. Create document at initial version 1
    const doc = await prisma.document.create({
      data: {
        title: "Cold Restart Resilience Document",
        content: "<p>Initial version 1</p>",
        version: 5, // Simulate document that has already evolved to version 5
        ownerId: testUserId,
        versions: {
          createMany: {
            data: [
              { versionNumber: 1, title: "Cold Restart Resilience Document", content: "<p>V1</p>", changedById: testUserId },
              { versionNumber: 2, title: "Cold Restart Resilience Document", content: "<p>V2</p>", changedById: testUserId },
              { versionNumber: 3, title: "Cold Restart Resilience Document", content: "<p>V3</p>", changedById: testUserId },
              { versionNumber: 4, title: "Cold Restart Resilience Document", content: "<p>V4</p>", changedById: testUserId },
              { versionNumber: 5, title: "Cold Restart Resilience Document", content: "<p>V5</p>", changedById: testUserId },
            ],
          },
        },
      },
    });
    testDocId = doc.id;
  });

  afterAll(async () => {
    if (testDocId) {
      await prisma.document.deleteMany({ where: { id: testDocId } });
    }
  });

  it("simulates cold restart: resets in-memory map and verifies hydration restores true DB version N", async () => {
    // 1. Simulate fresh server process after Render 15-minute idle shutdown
    documentVersions.clear();
    documentContents.clear();

    expect(documentVersions.get(testDocId)).toBeUndefined();
    expect(documentContents.get(testDocId)).toBeUndefined();

    // 2. On first touch, ensureDocumentHydrated reads DB version 5
    const hydrated = await ensureDocumentHydrated(testDocId);
    expect(hydrated.version).toBe(5);
    expect(documentVersions.get(testDocId)).toBe(5);

    // 3. Increment counter produces N + 1 (6), NOT 2!
    const nextVersion = incrementDocumentVersion(testDocId);
    expect(nextVersion).toBe(6);

    // 4. Update document with the next resolved version
    const updateResult = await updateDocument(testDocId, testUserId, {
      title: "Updated Post-Restart",
      content: "<p>Content written after cold restart</p>",
      version: nextVersion,
    });

    expect(updateResult.success).toBe(true);
    if (updateResult.success) {
      expect(updateResult.data.version).toBe(6);
    }

    // 5. Verify DocumentVersion snapshot 6 was cleanly created without P2002 conflict
    const version6Snapshot = await prisma.documentVersion.findUnique({
      where: {
        documentId_versionNumber: {
          documentId: testDocId,
          versionNumber: 6,
        },
      },
    });

    expect(version6Snapshot).not.toBeNull();
    expect(version6Snapshot?.versionNumber).toBe(6);
  });

  it("handles concurrent first-touches without race conditions (deduplicated in-flight hydration)", async () => {
    // 1. Reset memory to simulate cold restart
    documentVersions.clear();
    documentContents.clear();

    // 2. Fire 5 simultaneous requests trying to hydrate the same document
    const results = await Promise.all([
      ensureDocumentHydrated(testDocId),
      ensureDocumentHydrated(testDocId),
      ensureDocumentHydrated(testDocId),
      ensureDocumentHydrated(testDocId),
      ensureDocumentHydrated(testDocId),
    ]);

    // 3. All simultaneous calls resolve to current DB version (6) consistently
    for (const res of results) {
      expect(res.version).toBe(6);
    }
    expect(getDocumentVersion(testDocId)).toBe(6);
  });
});
