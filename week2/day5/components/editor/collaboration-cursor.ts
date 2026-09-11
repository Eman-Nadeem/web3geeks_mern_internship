import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, Selection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

export interface RemoteCursor {
  userId: string;
  displayName: string;
  color: string;
  cursor: { from: number; to: number } | null;
}

export const collaborationCursorPluginKey = new PluginKey<{
  cursors: RemoteCursor[];
}>("collaborationCursor");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    collaborationCursor: {
      setRemoteCursors: (cursors: RemoteCursor[]) => ReturnType;
    };
  }
}

function resolveCursorPos(doc: any, rawPos: number): { pos: number; side: number } {
  const docSize = doc.content.size;
  const clampedRaw = Math.max(0, Math.min(rawPos, docSize));
  const $pos = doc.resolve(clampedRaw);

  if ($pos.parent.isTextblock) {
    const start = $pos.start();
    const end = $pos.end();
    const safeFrom = Math.max(start, Math.min(clampedRaw, end));
    const side = safeFrom >= end ? -1 : (safeFrom <= start ? 0 : -1);
    return { pos: safeFrom, side };
  } else {
    const nearSel = Selection.near($pos, -1);
    const safeFrom = nearSel ? nearSel.from : Math.max(1, Math.max(0, docSize - 1));
    const $nearPos = doc.resolve(safeFrom);
    const side = $nearPos.parent.isTextblock && safeFrom >= $nearPos.end() ? -1 : 0;
    return { pos: safeFrom, side };
  }
}

export const CollaborationCursor = Extension.create({
  name: "collaborationCursor",

  addCommands() {
    return {
      setRemoteCursors:
        (cursors: RemoteCursor[]) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            tr.setMeta(collaborationCursorPluginKey, cursors);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<{ cursors: RemoteCursor[] }>({
        key: collaborationCursorPluginKey,
        state: {
          init(): { cursors: RemoteCursor[] } {
            return { cursors: [] };
          },
          apply(tr, prev): { cursors: RemoteCursor[] } {
            const meta = tr.getMeta(collaborationCursorPluginKey);
            if (meta !== undefined) {
              return { cursors: meta as RemoteCursor[] };
            }

            // Map cursor positions when document changes so carets don't desync
            if (tr.docChanged && prev.cursors.length > 0) {
              const prevDocSize = (tr as any).docs?.[0]?.content?.size ?? 0;
              const isFullDocReplace =
                tr.steps.length > 0 &&
                tr.steps.some(
                  (s: any) => s.from === 0 && (s.to >= prevDocSize || s.to >= tr.doc.content.size)
                );

              const docSize = tr.doc.content.size;

              // Full document replacements (such as setContent) wipe from 0 to oldDocSize.
              // ProseMirror's tr.mapping.map() treats this as an entire replacement and maps any
              // position inside [0, oldDocSize] straight to newDocSize (the last line).
              // Preserve the stored cursor position (clamped to the new docSize) instead of remapping.
              if (isFullDocReplace) {
                const preserved = prev.cursors.map((c) => {
                  if (!c.cursor) return c;
                  return {
                    ...c,
                    cursor: {
                      from: Math.max(0, Math.min(c.cursor.from, docSize)),
                      to: Math.max(0, Math.min(c.cursor.to, docSize)),
                    },
                  };
                });
                return { cursors: preserved };
              }

              // Normal incremental edits: remap positions with tr.mapping.map
              const mapped = prev.cursors.map((c) => {
                if (!c.cursor) return c;
                try {
                  return {
                    ...c,
                    cursor: {
                      from: tr.mapping.map(c.cursor.from),
                      to: tr.mapping.map(c.cursor.to),
                    },
                  };
                } catch {
                  return c;
                }
              });
              return { cursors: mapped };
            }

            return prev;
          },
        },
        props: {
          decorations(state) {
            const pluginState = collaborationCursorPluginKey.getState(state);
            if (!pluginState || !pluginState.cursors || pluginState.cursors.length === 0) {
              return DecorationSet.empty;
            }

            const decorations: Decoration[] = [];
            const docSize = state.doc.content.size;

            for (const user of pluginState.cursors) {
              if (!user.cursor) continue;

              const { pos: safeFrom, side } = resolveCursorPos(state.doc, user.cursor.from);

              // 1. Text Selection Range Highlight (translucent colored overlay)
              if (user.cursor.from !== user.cursor.to) {
                const selFrom = Math.max(0, Math.min(user.cursor.from, docSize));
                const selTo = Math.max(0, Math.min(user.cursor.to, docSize));
                const min = Math.min(selFrom, selTo);
                const max = Math.max(selFrom, selTo);
                if (min < max) {
                  decorations.push(
                    Decoration.inline(
                      min,
                      max,
                      {
                        style: `background-color: ${user.color}33; border-radius: 2px;`,
                        class: "collaboration-selection-range",
                      },
                      { key: `selection-${user.userId}` }
                    )
                  );
                }
              }

              // 2. Cursor Caret & Floating Name Badge (Stable key prevents DOM node recreation)
              const widget = Decoration.widget(
                safeFrom,
                () => {
                  const container = document.createElement("span");
                  container.className = "collaboration-cursor-caret";
                  container.style.position = "relative";
                  container.style.display = "inline-block";
                  container.style.width = "0";
                  container.style.height = "1.2em";
                  container.style.verticalAlign = "text-bottom";
                  container.style.marginLeft = "0";
                  container.style.marginRight = "0";
                  container.style.userSelect = "none";
                  container.style.pointerEvents = "none";

                  // Vertical caret line (centered on 0-width insertion point)
                  const caret = document.createElement("span");
                  caret.style.position = "absolute";
                  caret.style.left = "-1px";
                  caret.style.top = "-0.15em";
                  caret.style.bottom = "-0.15em";
                  caret.style.width = "2px";
                  caret.style.backgroundColor = user.color;
                  caret.style.borderRadius = "1px";

                  // Floating Name Flag
                  const badge = document.createElement("span");
                  badge.style.position = "absolute";
                  badge.style.left = "-1px";
                  badge.style.top = "-1.4em";
                  badge.style.backgroundColor = user.color;
                  badge.style.color = "#ffffff";
                  badge.style.fontSize = "10px";
                  badge.style.fontWeight = "600";
                  badge.style.padding = "1px 5px";
                  badge.style.borderRadius = "4px";
                  badge.style.whiteSpace = "nowrap";
                  badge.style.boxShadow = "0 1px 3px rgba(0,0,0,0.25)";
                  badge.style.pointerEvents = "none";
                  badge.style.zIndex = "20";
                  badge.textContent = user.displayName || "Collaborator";

                  container.appendChild(caret);
                  container.appendChild(badge);
                  return container;
                },
                { side, key: `cursor-${user.userId}` }
              );

              decorations.push(widget);
            }

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
