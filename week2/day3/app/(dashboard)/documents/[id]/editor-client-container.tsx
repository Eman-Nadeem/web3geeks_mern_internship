"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { EditorHeader } from "@/components/editor/editor-header";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Toast, ToastItem } from "@/components/ui/toast";
import { useDocumentSocket } from "@/lib/realtime/use-document-socket";
import { DocumentUpdatePayload, Collaborator } from "@/lib/realtime/events";
import { AccessRole } from "@/lib/db/documents";
import { AlertCircle } from "lucide-react";

interface EditorClientContainerProps {
  id: string;
  initialTitle: string;
  initialContent: string;
  initialUpdatedAt: string;
  initialStatus?: string;
  initialCategory?: string;
  accessRole: AccessRole;
  ownerName: string;
  ownerEmail?: string;
  ownerAvatarUrl?: string | null;
  token?: string;
}

export interface ConflictState {
  localContent: string;
  serverContent: string;
  serverVersion: number;
}

export function EditorClientContainer({
  id,
  initialTitle,
  initialContent,
  initialStatus = "Draft",
  initialCategory = "General",
  accessRole,
  ownerName,
  ownerEmail,
  ownerAvatarUrl,
  token,
}: EditorClientContainerProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState(initialStatus);
  const [category, setCategory] = useState(initialCategory);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error" | "conflict">("saved");
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [showConflictDiff, setShowConflictDiff] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const isViewer = accessRole === "viewer";
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle broadcast updates received from remote collaborators
  const handleRemoteUpdate = useCallback((payload: DocumentUpdatePayload) => {
    if (payload.title !== undefined) {
      setTitle(payload.title);
    }
    if (payload.content !== undefined) {
      if (!conflictState) {
        setContent(payload.content);
      }
    }
    if (payload.status !== undefined) {
      setStatus(payload.status);
    }
    if (payload.category !== undefined) {
      setCategory(payload.category);
    }
    if (!conflictState) {
      setSaveStatus("saved");
    }
  }, [conflictState]);

  // Presence toast notifications when collaborators join/leave
  const handleUserJoined = useCallback(
    (collaborator: Collaborator) => {
      addToast({
        type: "user_joined",
        title: "Collaborator Joined",
        message: `${collaborator.name} joined the document`,
        userName: collaborator.name,
        avatarUrl: collaborator.avatarUrl,
        duration: 4000,
      });
    },
    [addToast]
  );

  const handleUserLeft = useCallback(
    (collaborator: Collaborator) => {
      addToast({
        type: "user_left",
        title: "Collaborator Left",
        message: `${collaborator.name} left the document`,
        userName: collaborator.name,
        avatarUrl: collaborator.avatarUrl,
        duration: 4000,
      });
    },
    [addToast]
  );

  // Initialize real-time WebSocket connection for this document
  const {
    connectionState,
    activeUsers,
    presenceUsers,
    remoteCursors,
    documentVersion,
    sendChange,
    sendCursor,
  } = useDocumentSocket({
    documentId: id,
    token,
    onRemoteUpdate: handleRemoteUpdate,
    onUserJoined: handleUserJoined,
    onUserLeft: handleUserLeft,
    onSyncResponse: (syncData) => {
      if (conflictState) {
        // Protect user's active offline conflict edits from being clobbered during sync response
        return;
      }
      if (syncData.content && syncData.content !== content) {
        setContent(syncData.content);
      }
    },
  });

  const saveDocumentViaHttp = useCallback(
    async (updatedTitle?: string, updatedContent?: string, jsonContent?: string) => {
      if (isViewer) return;

      try {
        setSaveStatus("saving");
        const targetContent = updatedContent !== undefined ? updatedContent : content;
        const res = await fetch(`/api/documents/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: updatedTitle !== undefined ? updatedTitle : title,
            content: targetContent,
            jsonContent,
            baseVersion: documentVersion,
          }),
        });

        if (res.status === 409) {
          const conflictData = await res.json().catch(() => null);
          console.warn("[HTTP Autosave] 409 Conflict detected on stale write:", conflictData);
          // Preserve local uncommitted content in conflictState — DO NOT discard or overwrite silently
          setConflictState({
            localContent: targetContent,
            serverContent: conflictData?.content || "",
            serverVersion: conflictData?.currentVersion ?? documentVersion + 1,
          });
          setSaveStatus("conflict");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to save changes");
        }

        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaveStatus("error");
      }
    },
    [id, title, content, documentVersion, isViewer]
  );

  const handleResolveKeepMine = async () => {
    if (!conflictState || isViewer) return;
    try {
      setSaveStatus("saving");
      const res = await fetch(`/api/documents/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: conflictState.localContent,
          baseVersion: conflictState.serverVersion,
        }),
      });
      if (res.ok) {
        setContent(conflictState.localContent);
        setConflictState(null);
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  };

  const handleResolveUseServer = () => {
    if (!conflictState) return;
    setContent(conflictState.serverContent);
    setConflictState(null);
    setSaveStatus("saved");
  };

  const handleTitleChange = (newTitle: string) => {
    if (isViewer) return;

    setTitle(newTitle);
    // Broadcast title change via real-time WebSocket
    sendChange({ title: newTitle });
    
    // Fallback: Persist via HTTP only when offline/disconnected
    if (connectionState !== "connected") {
      saveDocumentViaHttp(newTitle, undefined);
    }

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
    if (isViewer) return;

    setContent(newHtml);
    setSaveStatus("saving");

    // Broadcast change to room members via Socket.IO (primary live persistence path)
    sendChange({ content: newHtml, jsonContent: newJson });

    // Architectural Fix (Option c): HTTP autosave acts strictly as an offline fallback
    if (connectionState !== "connected") {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      autoSaveTimerRef.current = setTimeout(() => {
        saveDocumentViaHttp(title, newHtml, newJson);
      }, 600);
    } else {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (isViewer) return;
    setStatus(newStatus);
    sendChange({ status: newStatus });
    try {
      await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const handleCategoryChange = async (newCategory: string) => {
    if (isViewer) return;
    setCategory(newCategory);
    sendChange({ category: newCategory });
    try {
      await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
    } catch (e) {
      console.error("Failed to update category:", e);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <EditorHeader
        documentId={id}
        initialTitle={title}
        status={status}
        category={category}
        saveStatus={saveStatus}
        connectionState={connectionState}
        activeUsers={activeUsers}
        presenceUsers={presenceUsers}
        documentVersion={documentVersion}
        accessRole={accessRole}
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        ownerAvatarUrl={ownerAvatarUrl}
        onTitleChange={handleTitleChange}
        onStatusChange={handleStatusChange}
        onCategoryChange={handleCategoryChange}
      />

      {/* Non-blocking Offline Banner */}
      {connectionState === "disconnected" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs text-amber-800 animate-in fade-in duration-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            <strong>Offline mode:</strong> You can continue editing locally. Changes will sync
            automatically when real-time connection recovers.
          </span>
        </div>
      )}

      {/* 409 Offline Edit Conflict Resolution Banner */}
      {conflictState && (
        <div
          data-testid="conflict-banner"
          className="bg-amber-50 border-b border-amber-300 px-4 py-3 text-xs text-amber-900 animate-in fade-in duration-200"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Offline edit conflict detected:</span> The document was modified on the server while you were disconnected. Your local edits have been preserved.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                data-testid="resolve-keep-mine"
                onClick={handleResolveKeepMine}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded shadow-xs cursor-pointer transition-colors"
              >
                Keep My Changes
              </button>
              <button
                type="button"
                data-testid="resolve-use-server"
                onClick={handleResolveUseServer}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold rounded cursor-pointer transition-colors"
              >
                Use Server Version
              </button>
              <button
                type="button"
                data-testid="toggle-draft-view"
                onClick={() => setShowConflictDiff(!showConflictDiff)}
                className="text-amber-800 underline hover:text-amber-950 font-medium ml-1 cursor-pointer"
              >
                {showConflictDiff ? "Hide Draft" : "View My Draft"}
              </button>
            </div>
          </div>
          {showConflictDiff && (
            <div className="mt-3 p-3 bg-white rounded border border-amber-200 text-slate-800 max-w-4xl mx-auto">
              <div className="font-semibold text-slate-700 mb-1">Your Preserved Offline Draft:</div>
              <div
                data-testid="preserved-draft-content"
                className="font-mono text-[11px] bg-slate-50 p-2 rounded border border-slate-200 whitespace-pre-wrap max-h-40 overflow-y-auto"
              >
                {conflictState.localContent}
              </div>
            </div>
          )}
        </div>
      )}

      <main className="flex-1 p-4 md:p-8">
        <TiptapEditor
          content={content}
          onChange={handleContentChange}
          readOnly={isViewer}
          remoteCursors={remoteCursors}
          onCursorChange={sendCursor}
        />
      </main>

      {/* Real-time Presence Toasts (Bottom Right) */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            userName={toast.userName}
            avatarUrl={toast.avatarUrl}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
}
