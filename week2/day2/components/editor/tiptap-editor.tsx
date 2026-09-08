"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Eye,
} from "lucide-react";

interface TiptapEditorProps {
  content: string;
  onChange: (htmlContent: string, jsonContent?: string) => void;
  readOnly?: boolean;
}

/**
 * Normalizes input HTML to guarantee that every line/paragraph is a discrete block node.
 * Converts internal <br> tags, soft breaks, and newlines into separate <p> blocks.
 */
export function normalizeHtml(input: string): string {
  if (!input || !input.trim()) {
    return "<p></p>";
  }
  const trimmed = input.trim();

  // 1. Plain text without HTML tags -> split lines into paragraphs
  if (!trimmed.startsWith("<")) {
    const paragraphs = trimmed
      .split(/\r?\n+/)
      .map((line) => `<p>${line.trim()}</p>`)
      .filter((p) => p !== "<p></p>");
    return paragraphs.length > 0 ? paragraphs.join("") : "<p></p>";
  }

  // 2. HTML containing <br> or soft line breaks -> split into distinct <p> blocks
  // so headings (H1/H2) format only the targeted line, not 2-3 lines in the same block.
  let normalized = trimmed
    .replace(/<br\s*\/?>/gi, "</p><p>")
    .replace(/\r?\n+/g, "</p><p>");

  // Remove empty paragraph artifacts created by consecutive breaks
  normalized = normalized.replace(/<p>\s*<\/p>/gi, "");

  if (!normalized || (!normalized.startsWith("<p>") && !normalized.startsWith("<h") && !normalized.startsWith("<ul") && !normalized.startsWith("<ol") && !normalized.startsWith("<block"))) {
    normalized = `<p>${normalized || ""}</p>`;
  }

  return normalized;
}

export function TiptapEditor({ content, onChange, readOnly = false }: TiptapEditorProps) {
  const isInitialMount = useRef(true);
  const lastEmittedHtml = useRef<string>(normalizeHtml(content));

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
    ],
    content: normalizeHtml(content),
    editorProps: {
      attributes: {
        class:
          "focus:outline-none min-h-[480px] text-(--text-primary) text-base leading-relaxed selection:bg-(--accent-soft-bg)",
        contenteditable: !readOnly ? "true" : "false",
      },
    },
    onUpdate: ({ editor }) => {
      if (readOnly) return;
      const html = editor.getHTML();
      const json = JSON.stringify(editor.getJSON());
      lastEmittedHtml.current = html;
      onChange(html, json);
    },
  });

  // Dynamically sync editable state when role or readOnly prop changes
  useEffect(() => {
    if (editor && editor.isEditable !== !readOnly) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  // External content sync (e.g. broadcast received from remote collaborator)
  useEffect(() => {
    if (!editor) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const normalized = normalizeHtml(content);
    if (normalized !== lastEmittedHtml.current && normalized !== editor.getHTML()) {
      lastEmittedHtml.current = normalized;
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="p-12 text-center text-(--text-tertiary) animate-pulse-subtle">
        Loading document canvas...
      </div>
    );
  }

  const buttonBaseClass = readOnly
    ? "p-1.5 rounded-md text-xs font-medium text-slate-400 opacity-40 cursor-not-allowed pointer-events-none"
    : "p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer";

  return (
    <div className="w-full max-w-4xl mx-auto border border-(--border-subtle) rounded-xl bg-(--bg-surface) shadow-clarity my-6">
      {/* Read-Only Notice Banner for Viewers */}
      {readOnly && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-(--border-subtle) rounded-t-xl text-xs text-slate-600 font-medium">
          <Eye className="w-4 h-4 text-slate-500 shrink-0" />
          <span>Viewing only — You have read-only access to this document. Formatting controls and typing are disabled.</span>
        </div>
      )}

      {/* Formatting Toolbar (Visible in both modes; visibly greyed-out and disabled for viewers) */}
      <div
        className={`flex flex-wrap items-center gap-1.5 px-4 py-2.5 border-b border-(--border-subtle) ${
          readOnly ? "bg-slate-50/50" : "bg-(--bg-surface-muted)"
        } ${!readOnly ? "rounded-t-xl" : ""}`}
        aria-disabled={readOnly}
      >
        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleBold().run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("bold")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Bold (Ctrl+B)"}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleItalic().run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("italic")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Italic (Ctrl+I)"}
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-(--border-subtle) mx-1" />

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("heading", { level: 1 })
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Heading 1"}
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("heading", { level: 2 })
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Heading 2"}
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("heading", { level: 3 })
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Heading 3"}
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-(--border-subtle) mx-1" />

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleBulletList().run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("bulletList")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Bullet List"}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleOrderedList().run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("orderedList")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Numbered List"}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-(--border-subtle) mx-1" />

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleBlockquote().run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("blockquote")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Blockquote"}
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={readOnly}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().toggleCode().run()}
          className={`${buttonBaseClass} ${
            !readOnly && editor.isActive("code")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface)"
          }`}
          title={readOnly ? "Disabled in view-only mode" : "Inline Code"}
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-(--border-subtle) mx-1" />

        <button
          type="button"
          disabled={readOnly || !editor.can().undo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().undo().run()}
          className={`${buttonBaseClass} text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface) disabled:opacity-40 disabled:cursor-not-allowed`}
          title={readOnly ? "Disabled in view-only mode" : "Undo (Ctrl+Z)"}
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={readOnly || !editor.can().redo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => !readOnly && editor.chain().focus().redo().run()}
          className={`${buttonBaseClass} text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface) disabled:opacity-40 disabled:cursor-not-allowed`}
          title={readOnly ? "Disabled in view-only mode" : "Redo (Ctrl+Y)"}
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Canvas */}
      <div className={`p-6 sm:p-8 bg-white rounded-b-xl ${readOnly ? "select-text cursor-default" : ""}`}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
