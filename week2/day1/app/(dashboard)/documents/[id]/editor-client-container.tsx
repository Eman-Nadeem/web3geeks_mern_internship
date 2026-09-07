"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { EditorHeader } from "@/components/editor/editor-header";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Toast, ToastProps } from "@/components/ui/toast";

interface EditorClientContainerProps {
  id: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
}

export function EditorClientContainer({
  id,
  initialTitle,
  initialContent,
}: EditorClientContainerProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [toast, setToast] = useState<Omit<ToastProps, "onClose"> | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const saveDocument = useCallback(
    async (updatedTitle?: string, updatedContent?: string, jsonContent?: string) => {
      try {
        setSaveStatus("saving");
        const res = await fetch(`/api/documents/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: updatedTitle !== undefined ? updatedTitle : title,
            content: updatedContent !== undefined ? updatedContent : content,
            jsonContent,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to save changes");
        }

        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaveStatus("error");
        setToast({
          type: "error",
          message: "Failed to auto-save document. Retrying on next edit.",
        });
      }
    },
    [id, title, content]
  );

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    saveDocument(newTitle, undefined);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("documents-updated", {
          detail: { id, title: newTitle },
        })
      );
    }
  };

  useEffect(() => {
    const handleDocUpdate = (e: Event) => {
      const customEv = e as CustomEvent<{ id?: string; title?: string }>;
      if (customEv.detail?.id === id && customEv.detail?.title !== undefined) {
        setTitle(customEv.detail.title);
      }
    };
    window.addEventListener("documents-updated", handleDocUpdate);
    return () => window.removeEventListener("documents-updated", handleDocUpdate);
  }, [id]);

  const handleContentChange = (newHtml: string, newJson?: string) => {
    setContent(newHtml);
    setSaveStatus("saving");

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveDocument(title, newHtml, newJson);
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <EditorHeader
        documentId={id}
        initialTitle={title}
        saveStatus={saveStatus}
        onTitleChange={handleTitleChange}
      />

      <main className="flex-1 p-4 md:p-8">
        <TiptapEditor content={content} onChange={handleContentChange} />
      </main>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
