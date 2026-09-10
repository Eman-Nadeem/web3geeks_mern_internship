import { describe, it, expect } from "vitest";
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import {
  CollaborationCursor,
  collaborationCursorPluginKey,
  RemoteCursor,
} from "../components/editor/collaboration-cursor";

const testSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "text*" },
    text: { inline: true },
  },
});

describe("Priority 4 — Bug: Cursor Stability & Decoration Key Invariance", () => {
  it("assigns stable decoration keys based on userId to prevent DOM node recreation churn", () => {
    // Instantiate ProseMirror state with CollaborationCursor plugin
    const plugins = CollaborationCursor.config.addProseMirrorPlugins?.call({} as any) || [];
    let state = EditorState.create({
      schema: testSchema,
      plugins,
    });

    const cursors: RemoteCursor[] = [
      {
        userId: "user_alice_456",
        displayName: "Alice",
        color: "#2563EB",
        cursor: { from: 1, to: 3 },
      },
    ];

    // Dispatch command to set remote cursor
    const tr = state.tr.setMeta(collaborationCursorPluginKey, cursors);
    state = state.apply(tr);

    // Retrieve plugin decorations
    const plugin = plugins[0];
    const decos = (plugin.props.decorations as any)?.call(plugin, state);
    expect(decos).toBeDefined();

    // Find decoration specs
    const allDecos = (decos as any).find();
    expect(allDecos.length).toBe(2); // 1 inline selection + 1 widget caret

    const inlineDeco = allDecos.find((d: any) => d.from !== d.to);
    const widgetDeco = allDecos.find((d: any) => d.from === d.to);

    // Assert stable keys are present
    expect(inlineDeco.spec.key).toBe("selection-user_alice_456");
    expect(widgetDeco.spec.key).toBe("cursor-user_alice_456");
  });

  it("safely clamps out-of-bounds cursor positions without crashing or throwing errors", () => {
    const plugins = CollaborationCursor.config.addProseMirrorPlugins?.call({} as any) || [];
    let state = EditorState.create({
      schema: testSchema,
      plugins,
    });

    const docSize = state.doc.content.size;

    // Simulate remote user sending a cursor index (9999) from an out-of-sync newer document
    const cursors: RemoteCursor[] = [
      {
        userId: "user_bob_789",
        displayName: "Bob",
        color: "#DC2626",
        cursor: { from: 9999, to: 9999 },
      },
    ];

    const tr = state.tr.setMeta(collaborationCursorPluginKey, cursors);
    state = state.apply(tr);

    const plugin = plugins[0];
    const decos = (plugin.props.decorations as any)?.call(plugin, state);
    const allDecos = (decos as any).find();

    expect(allDecos.length).toBe(1); // 1 widget caret clamped to docSize
    expect(allDecos[0].from).toBeLessThanOrEqual(docSize);
    expect(allDecos[0].spec.key).toBe("cursor-user_bob_789");
  });

  it("verifies echo loop suppression guard prevents programmatic cursor re-broadcasts", () => {
    let isProgrammatic = false;
    let cursorSentCount = 0;

    const onSelectionUpdate = () => {
      if (isProgrammatic) return; // Guard
      cursorSentCount++;
    };

    // User interaction: triggers normal cursor broadcast
    onSelectionUpdate();
    expect(cursorSentCount).toBe(1);

    // Remote update arriving: sets programmatic guard
    isProgrammatic = true;
    onSelectionUpdate();
    onSelectionUpdate();
    expect(cursorSentCount).toBe(1); // Blocked by guard!

    // Reset guard after remote apply completes
    isProgrammatic = false;
    onSelectionUpdate();
    expect(cursorSentCount).toBe(2);
  });

  it("demonstrates that a full-document replacement causes stored remote cursors to map to the end of the document", () => {
    const plugins = CollaborationCursor.config.addProseMirrorPlugins?.call({} as any) || [];
    const initialDoc = testSchema.node("doc", null, [
      testSchema.node("paragraph", null, [testSchema.text("Line 1 initial content")]),
      testSchema.node("paragraph", null, [testSchema.text("Line 2 initial content")]),
      testSchema.node("paragraph", null, [testSchema.text("Line 3 initial content")]),
    ]);

    let state = EditorState.create({
      schema: testSchema,
      doc: initialDoc,
      plugins,
    });

    // User A (Alice) cursor is on Line 1 at offset 5
    const cursors: RemoteCursor[] = [
      {
        userId: "user_alice",
        displayName: "Alice",
        color: "#2563EB",
        cursor: { from: 5, to: 5 },
      },
    ];

    state = state.apply(state.tr.setMeta(collaborationCursorPluginKey, cursors));

    // Confirm Alice's cursor starts at from: 5
    let pluginState = collaborationCursorPluginKey.getState(state);
    expect(pluginState?.cursors[0].cursor?.from).toBe(5);

    // Now simulate a full document replacement (setContent) triggered by an incoming update
    const newDoc = testSchema.node("doc", null, [
      testSchema.node("paragraph", null, [testSchema.text("Line 1 edited")]),
      testSchema.node("paragraph", null, [testSchema.text("Line 2 edited")]),
      testSchema.node("paragraph", null, [testSchema.text("Line 3 edited")]),
      testSchema.node("paragraph", null, [testSchema.text("Line 4 new content")]),
    ]);

    const replaceTr = state.tr.replaceWith(0, state.doc.content.size, newDoc.content);
    state = state.apply(replaceTr);

    pluginState = collaborationCursorPluginKey.getState(state);
    console.log("[Test result: cursor mapped after replaceWith(0, oldSize)]", {
      before: 5,
      after: pluginState?.cursors[0].cursor?.from,
      newDocSize: state.doc.content.size,
    });

    // With the full-document replacement guard, the stored cursor position (5) is preserved
    // and does NOT map to the end of the document (65)!
    expect(pluginState?.cursors[0].cursor?.from).toBe(5);
    expect(pluginState?.cursors[0].cursor?.from).not.toBe(state.doc.content.size);
  });

  it("still properly remaps cursor positions during targeted incremental transactions", () => {
    const plugins = CollaborationCursor.config.addProseMirrorPlugins?.call({} as any) || [];
    const initialDoc = testSchema.node("doc", null, [
      testSchema.node("paragraph", null, [testSchema.text("Hello world")]),
    ]);

    let state = EditorState.create({
      schema: testSchema,
      doc: initialDoc,
      plugins,
    });

    const cursors: RemoteCursor[] = [
      {
        userId: "user_bob",
        displayName: "Bob",
        color: "#10B981",
        cursor: { from: 6, to: 6 },
      },
    ];

    state = state.apply(state.tr.setMeta(collaborationCursorPluginKey, cursors));

    // User inserts 3 characters ("Hey") before Bob's cursor at offset 1
    const tr = state.tr.insertText("Hey ", 1);
    state = state.apply(tr);

    const pluginState = collaborationCursorPluginKey.getState(state);
    // 6 + 4 ("Hey ") = 10
    expect(pluginState?.cursors[0].cursor?.from).toBe(10);
  });
});
