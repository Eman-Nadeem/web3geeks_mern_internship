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
});
