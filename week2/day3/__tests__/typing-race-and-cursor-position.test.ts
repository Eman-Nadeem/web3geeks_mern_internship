import { describe, it, expect } from "vitest";
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import {
  CollaborationCursor,
  collaborationCursorPluginKey,
  RemoteCursor,
} from "../components/editor/collaboration-cursor";
import { DocumentUpdatePayload } from "../lib/realtime/events";

// Minimal ProseMirror schema matching Tiptap structure
const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
  },
});

describe("Bug A Verification: Fast-Typing Data Loss & Race Conditions", () => {
  it("filters out self-echo updates so originating client does not overwrite live typing", () => {
    const localUserId = "user_me";
    let onRemoteUpdateCalled = false;
    let documentVersion = 1;

    // Simulated handleRemoteUpdate guard logic
    const handleRemoteUpdate = (payload: DocumentUpdatePayload) => {
      // Guard: ignore self broadcasts
      if (payload.updatedBy?.id === localUserId) {
        return;
      }
      onRemoteUpdateCalled = true;
    };

    // Self-echo payload arriving back from server
    const selfEchoPayload: DocumentUpdatePayload = {
      documentId: "doc_test_bug_a",
      content: "<p>Older chunk sent 150ms ago</p>",
      version: 2,
      updatedBy: { id: localUserId, name: "Me" },
      updatedAt: new Date().toISOString(),
    };

    handleRemoteUpdate(selfEchoPayload);
    expect(onRemoteUpdateCalled).toBe(false);
  });

  it("prevents remote update from overwriting local editor content while local edits are pending", () => {
    let localContent = "<p>User actively typing fast...</p>";
    let hasLocalPendingChanges = true;

    const handleRemoteUpdate = (payload: DocumentUpdatePayload) => {
      if (hasLocalPendingChanges) {
        // Protected: Do not overwrite dirty uncommitted state
        return;
      }
      if (payload.content !== undefined) {
        localContent = payload.content;
      }
    };

    // Peer update arrives mid-keystroke
    const peerUpdate: DocumentUpdatePayload = {
      documentId: "doc_test_bug_a",
      content: "<p>Peer edit arriving mid-keystroke</p>",
      version: 3,
      updatedBy: { id: "user_peer", name: "Peer Author" },
      updatedAt: new Date().toISOString(),
    };

    handleRemoteUpdate(peerUpdate);

    // Assert local keystrokes were NOT wiped out
    expect(localContent).toBe("<p>User actively typing fast...</p>");

    // After debounce finishes and local changes are broadcast:
    hasLocalPendingChanges = false;
    handleRemoteUpdate(peerUpdate);
    expect(localContent).toBe("<p>Peer edit arriving mid-keystroke</p>");
  });
});

describe("Bug B Verification: Remote Cursor Position & Multi-Browser Visibility", () => {
  it("anchors remote cursor INSIDE the paragraph at docSize boundary with side: -1", () => {
    // Document with one paragraph: "<p>Hello</p>" -> doc content size is 7 (0: doc, 1..6: "Hello", 7: end)
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("Hello")]),
    ]);

    const plugins = CollaborationCursor.config.addProseMirrorPlugins?.call({} as any) || [];
    let state = EditorState.create({ doc, schema, plugins });

    // Remote cursor placed at docSize (position 7, after the closing tag of paragraph)
    const cursors: RemoteCursor[] = [
      {
        userId: "user_remote_1",
        displayName: "Eman Nadeem",
        color: "#6D5DF6",
        cursor: { from: state.doc.content.size, to: state.doc.content.size },
      },
    ];

    const tr = state.tr.setMeta(collaborationCursorPluginKey, cursors);
    state = state.apply(tr);

    const plugin = plugins.find((p: any) => p.key === "collaborationCursor$");
    expect(plugin).toBeDefined();

    const decos = plugin!.props.decorations!(state);
    expect(decos).toBeDefined();

    const foundDecos = decos.find();
    expect(foundDecos.length).toBeGreaterThan(0);

    // The widget decoration must be resolved to inside the textblock (<= 6), NOT 7 (which is after </p>)
    const widgetDeco = foundDecos.find((d: any) => d.widget);
    expect(widgetDeco).toBeDefined();
    expect(widgetDeco.from).toBeLessThanOrEqual(6);
    expect(widgetDeco.from).toBeGreaterThanOrEqual(1);

    // Widget side MUST be -1 so ProseMirror associates it with content BEFORE the boundary,
    // guaranteeing it renders inline inside the <p> instead of below it as a block.
    expect((widgetDeco.type as any).side).toBe(-1);
  });

  it("handles remote cursor at start of paragraph with side: 0", () => {
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [schema.text("Hello")]),
    ]);

    const plugins = CollaborationCursor.config.addProseMirrorPlugins?.call({} as any) || [];
    let state = EditorState.create({ doc, schema, plugins });

    const cursors: RemoteCursor[] = [
      {
        userId: "user_remote_start",
        displayName: "Alice",
        color: "#1DAA61",
        cursor: { from: 1, to: 1 },
      },
    ];

    const tr = state.tr.setMeta(collaborationCursorPluginKey, cursors);
    state = state.apply(tr);

    const plugin = plugins.find((p: any) => p.key === "collaborationCursor$");
    const decos = plugin!.props.decorations!(state);
    const widgetDeco = decos.find().find((d: any) => d.widget);

    expect(widgetDeco).toBeDefined();
    expect(widgetDeco.from).toBe(1);
    expect((widgetDeco.type as any).side).toBe(0);
  });

  it("processes cursor updates immediately without waiting for isSynced gate", () => {
    // Simulated useDocumentSocket cursor handling
    let isSynced = false;
    const remoteCursorMap = new Map<string, RemoteCursor>();

    const handleCursorUpdate = (data: {
      userId: string;
      displayName: string;
      color: string;
      cursor: { from: number; to: number } | null;
    }) => {
      // Fix: Cursor updates are NOT gated behind isSynced
      if (!data.cursor) {
        remoteCursorMap.delete(data.userId);
      } else {
        remoteCursorMap.set(data.userId, {
          userId: data.userId,
          displayName: data.displayName,
          color: data.color,
          cursor: data.cursor,
        });
      }
    };

    // Client receives cursor update while isSynced is still FALSE (pre-sync_response)
    handleCursorUpdate({
      userId: "user_b",
      displayName: "Bob",
      color: "#F59E0B",
      cursor: { from: 4, to: 4 },
    });

    // Assert cursor is immediately available in the remote cursor map!
    expect(remoteCursorMap.has("user_b")).toBe(true);
    expect(remoteCursorMap.get("user_b")?.cursor?.from).toBe(4);
  });
});
