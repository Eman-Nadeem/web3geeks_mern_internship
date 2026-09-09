import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
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

              const from = Math.max(0, Math.min(user.cursor.from, docSize));
              const to = Math.max(0, Math.min(user.cursor.to, docSize));

              // 1. Text Selection Range Highlight (translucent colored overlay)
              if (from !== to) {
                const min = Math.min(from, to);
                const max = Math.max(from, to);
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
                from,
                () => {
                  const container = document.createElement("span");
                  container.className = "collaboration-cursor-caret";
                  container.style.position = "relative";
                  container.style.display = "inline-block";
                  container.style.width = "2px";
                  container.style.height = "1.2em";
                  container.style.verticalAlign = "text-bottom";
                  container.style.marginLeft = "-1px";
                  container.style.marginRight = "-1px";
                  container.style.userSelect = "none";
                  container.style.pointerEvents = "none";

                  // Vertical caret line
                  const caret = document.createElement("span");
                  caret.style.position = "absolute";
                  caret.style.left = "0";
                  caret.style.top = "-0.15em";
                  caret.style.bottom = "-0.15em";
                  caret.style.width = "2px";
                  caret.style.backgroundColor = user.color;
                  caret.style.borderRadius = "1px";

                  // Floating Name Flag
                  const badge = document.createElement("span");
                  badge.style.position = "absolute";
                  badge.style.left = "0";
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
                { side: 1, key: `cursor-${user.userId}` }
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
