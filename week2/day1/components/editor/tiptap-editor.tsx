"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import Blockquote from "@tiptap/extension-blockquote";
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
} from "lucide-react";

interface TiptapEditorProps {
  content: string;
  onChange: (htmlContent: string, jsonContent?: string) => void;
}

export function TiptapEditor({ content, onChange }: TiptapEditorProps) {
  const isInitialMount = useRef(true);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
      }),
      Heading.configure({ levels: [1, 2, 3] }),
      BulletList,
      OrderedList,
      Blockquote,
    ],
    content: content || "<p></p>",
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[480px] text-(--text-primary) text-base leading-relaxed",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = JSON.stringify(editor.getJSON());
      onChange(html, json);
    },
  });

  useEffect(() => {
    if (editor && content !== undefined && isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "<p></p>");
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="p-12 text-center text-(--text-tertiary) animate-pulse-subtle">
        Loading document canvas...
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto border border-(--border-subtle) rounded-xl bg-(--bg-surface) shadow-clarity my-6">
      {/* Restrained Formatting Toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 px-4 py-3 bg-(--bg-surface-muted) border-b border-(--border-subtle) rounded-t-xl">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("bold")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("italic")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-(--border-subtle) mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("heading", { level: 1 })
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("heading", { level: 2 })
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("heading", { level: 3 })
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-(--border-subtle) mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("bulletList")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("orderedList")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-(--border-subtle) mx-1" />

        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("blockquote")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Blockquote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
            editor.isActive("code")
              ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
              : "text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted)"
          }`}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Canvas */}
      <div className="p-6 sm:p-8 bg-white rounded-b-xl">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
