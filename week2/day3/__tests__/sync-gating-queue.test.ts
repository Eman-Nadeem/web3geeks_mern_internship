import { describe, it, expect } from "vitest";
import { DocumentUpdatePayload, SyncResponsePayload } from "../lib/realtime/events";

describe("Priority 2 — Data Loss: Sync Race Condition on Join/Reconnect", () => {
  it("buffers live peer edit arriving before sync_response and applies it on top of synced snapshot", () => {
    // Simulate the client-side state and buffer defined in use-document-socket.ts
    let isSynced = false;
    let documentContent = "Initial Pre-join State";
    let documentVersion = 1;
    const eventBuffer: { type: "document_update"; payload: DocumentUpdatePayload }[] = [];

    const applyRemoteUpdate = (payload: DocumentUpdatePayload) => {
      if (payload.content !== undefined) {
        documentContent = payload.content;
      }
      if (payload.version !== undefined) {
        documentVersion = payload.version;
      }
    };

    const handleDocumentUpdate = (data: DocumentUpdatePayload) => {
      if (!isSynced) {
        // Buffer event because sync_response has not yet arrived
        eventBuffer.push({ type: "document_update", payload: data });
        return;
      }
      applyRemoteUpdate(data);
    };

    const handleSyncResponse = (data: SyncResponsePayload) => {
      const syncedVersion = data.version ?? 1;
      documentVersion = syncedVersion;
      documentContent = data.content;

      // Open sync gate
      isSynced = true;

      // Drain buffer in arrival order
      const buffered = [...eventBuffer];
      eventBuffer.length = 0;

      for (const item of buffered) {
        if (item.type === "document_update") {
          // Drop stale updates if version <= syncedVersion
          if (item.payload.version !== undefined && item.payload.version <= syncedVersion) {
            continue;
          }
          applyRemoteUpdate(item.payload);
        }
      }
    };

    // Step 1: Client emits join_document, isSynced is false
    expect(isSynced).toBe(false);

    // Step 2: Peer edit arrives BEFORE sync_response completes (version 2)
    const peerEdit: DocumentUpdatePayload = {
      documentId: "doc_test_sync_race",
      content: "<p>Peer edit typed during join handshake</p>",
      version: 2,
      updatedBy: { id: "user_peer", name: "Peer Author" },
      updatedAt: new Date().toISOString(),
    };
    handleDocumentUpdate(peerEdit);

    // Assert the peer edit was buffered and NOT yet applied to documentContent
    expect(eventBuffer.length).toBe(1);
    expect(documentContent).toBe("Initial Pre-join State");

    // Step 3: sync_response arrives with older pre-edit snapshot (version 1)
    const syncResponse: SyncResponsePayload = {
      documentId: "doc_test_sync_race",
      content: "<p>Older pre-edit snapshot from DB</p>",
      version: 1,
      presence: [],
    };
    handleSyncResponse(syncResponse);

    // Step 4: Assert gate opened, buffer drained, and final state retains the peer edit!
    expect(isSynced).toBe(true);
    expect(eventBuffer.length).toBe(0);
    expect(documentVersion).toBe(2);
    expect(documentContent).toBe("<p>Peer edit typed during join handshake</p>");
  });

  it("drops buffered updates whose version is older than or equal to the sync_response version", () => {
    let isSynced = false;
    let documentContent = "Init";
    let documentVersion = 1;
    const eventBuffer: { type: "document_update"; payload: DocumentUpdatePayload }[] = [];

    const applyRemoteUpdate = (payload: DocumentUpdatePayload) => {
      if (payload.content !== undefined) documentContent = payload.content;
      if (payload.version !== undefined) documentVersion = payload.version;
    };

    const handleDocumentUpdate = (data: DocumentUpdatePayload) => {
      if (!isSynced) {
        eventBuffer.push({ type: "document_update", payload: data });
        return;
      }
      applyRemoteUpdate(data);
    };

    const handleSyncResponse = (data: SyncResponsePayload) => {
      const syncedVersion = data.version ?? 1;
      documentVersion = syncedVersion;
      documentContent = data.content;
      isSynced = true;

      const buffered = [...eventBuffer];
      eventBuffer.length = 0;

      for (const item of buffered) {
        if (item.type === "document_update") {
          if (item.payload.version !== undefined && item.payload.version <= syncedVersion) {
            // Stale: already reflected in sync_response snapshot
            continue;
          }
          applyRemoteUpdate(item.payload);
        }
      }
    };

    // Buffer an update with version 2
    handleDocumentUpdate({
      documentId: "doc_test_stale_drop",
      content: "<p>Stale v2 update</p>",
      version: 2,
      updatedBy: { id: "user_peer", name: "Peer" },
      updatedAt: new Date().toISOString(),
    });

    // sync_response arrives with version 3 (which already incorporates newer changes)
    handleSyncResponse({
      documentId: "doc_test_stale_drop",
      content: "<p>Authoritative v3 snapshot</p>",
      version: 3,
      presence: [],
    });

    // Assert the stale v2 was dropped and didn't overwrite the v3 snapshot
    expect(documentVersion).toBe(3);
    expect(documentContent).toBe("<p>Authoritative v3 snapshot</p>");
  });
});
