"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  UserPlus,
  Copy,
  Check,
  Trash2,
  Loader2,
  Shield,
  Eye,
  Edit3,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";

interface CollaboratorItem {
  id: string;
  userId: string;
  role: "editor" | "viewer";
  addedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

interface ShareDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle: string;
  isOwner: boolean;
  ownerName: string;
  ownerEmail?: string;
  ownerAvatarUrl?: string | null;
}

export function ShareDocumentModal({
  isOpen,
  onClose,
  documentId,
  documentTitle,
  isOwner,
  ownerName,
  ownerEmail,
  ownerAvatarUrl,
}: ShareDocumentModalProps) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [collaborators, setCollaborators] = useState<CollaboratorItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const fetchCollaborators = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/documents/${documentId}/collaborators`);
      if (res.ok) {
        const json = await res.json();
        setCollaborators(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch collaborators:", err);
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setSuccessMessage("");
      void fetchCollaborators();
    }
  }, [isOpen, fetchCollaborators]);

  if (!isOpen) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsInviting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch(`/api/documents/${documentId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to invite collaborator");
      }

      setSuccessMessage(`Access granted to ${email.trim()} as ${role}!`);
      setEmail("");
      void fetchCollaborators();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemove = async (targetUserId: string) => {
    try {
      const res = await fetch(
        `/api/documents/${documentId}/collaborators/${targetUserId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setCollaborators((prev) => prev.filter((c) => c.userId !== targetUserId));
      } else {
        const json = await res.json();
        setErrorMessage(json.error || "Failed to remove collaborator");
      }
    } catch (err) {
      console.error("Failed to remove collaborator:", err);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: "editor" | "viewer") => {
    try {
      const res = await fetch(
        `/api/documents/${documentId}/collaborators/${targetUserId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (res.ok) {
        setCollaborators((prev) =>
          prev.map((c) => (c.userId === targetUserId ? { ...c, role: newRole } : c))
        );
      } else {
        const json = await res.json();
        setErrorMessage(json.error || "Failed to update role");
      }
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/documents/${documentId}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl w-full max-w-lg p-6 shadow-clarity space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-(--accent-soft-bg) text-(--accent-primary)">
              <UserPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-(--text-primary) truncate">
                Share &ldquo;{documentTitle}&rdquo;
              </h3>
              <p className="text-[11px] text-(--text-tertiary)">
                Manage permissions and real-time collaborators
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted) rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alerts */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
            {successMessage}
          </div>
        )}

        {/* Invite Form (Owner Only) */}
        {isOwner ? (
          <form onSubmit={handleInvite} className="space-y-2">
            <label className="block text-xs font-semibold text-(--text-secondary)">
              Invite collaborator by email
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                className="flex-1 px-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary) transition-colors"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
                className="px-2.5 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) focus:outline-none focus:border-(--accent-primary) cursor-pointer"
              >
                <option value="editor">Editor (Can edit)</option>
                <option value="viewer">Viewer (Read-only)</option>
              </select>
              <button
                type="submit"
                disabled={isInviting}
                className="px-4 py-2 text-xs font-medium bg-(--accent-primary) hover:bg-(--accent-primary-hover) text-white rounded-lg shadow-clarity flex items-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer shrink-0"
              >
                {isInviting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Invite</span>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="p-3 rounded-xl bg-(--bg-surface-muted) border border-(--border-subtle) text-xs text-(--text-secondary)">
            You are an authorized collaborator on this document. Only the owner can invite or remove members.
          </div>
        )}

        {/* Collaborators List */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-(--text-secondary) flex items-center justify-between">
            <span>People with access</span>
            <span className="text-[11px] text-(--text-tertiary) font-normal">
              {collaborators.length + 1} member{collaborators.length > 0 ? "s" : ""}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-(--border-subtle)">
            {/* Owner Row */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-(--accent-primary) text-white flex items-center justify-center text-[10px] font-bold overflow-hidden border border-(--border-subtle) shrink-0">
                  {ownerAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ownerAvatarUrl} alt={ownerName} className="w-full h-full object-cover" />
                  ) : (
                    ownerName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                    <span className="truncate">{ownerName}</span>
                    {user?.name === ownerName && (
                      <span className="text-[10px] text-(--text-tertiary)">(You)</span>
                    )}
                  </div>
                  <span className="text-[11px] text-(--text-tertiary) truncate">
                    {ownerEmail || "Document Owner"}
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700 shrink-0 flex items-center gap-1">
                <Shield className="w-2.5 h-2.5" />
                Owner
              </span>
            </div>

            {/* Collaborator Rows */}
            {isLoading ? (
              <div className="py-4 text-center text-xs text-(--text-tertiary)">
                Loading collaborators...
              </div>
            ) : (
              collaborators.map((col) => {
                const isCurrentUser = col.userId === user?.id;
                return (
                  <div key={col.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-(--accent-soft-bg) text-(--accent-primary) flex items-center justify-center text-[10px] font-bold overflow-hidden border border-(--border-subtle) shrink-0">
                        {col.user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={col.user.avatarUrl}
                            alt={col.user.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          col.user.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                          <span className="truncate">{col.user.name}</span>
                          {isCurrentUser && (
                            <span className="text-[10px] text-(--text-tertiary)">(You)</span>
                          )}
                        </div>
                        <span className="text-[11px] text-(--text-tertiary) truncate">
                          {col.user.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isOwner ? (
                        <>
                          <select
                            value={col.role}
                            onChange={(e) =>
                              handleRoleChange(col.userId, e.target.value as "editor" | "viewer")
                            }
                            className="text-[11px] py-1 px-2 rounded-md bg-(--bg-surface-muted) border border-(--border-subtle) text-(--text-primary) cursor-pointer focus:outline-none"
                          >
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handleRemove(col.userId)}
                            className="p-1 text-(--text-tertiary) hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Remove access"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-(--bg-surface-muted) border border-(--border-subtle) text-[10px] font-semibold text-(--text-secondary) flex items-center gap-1">
                          {col.role === "editor" ? (
                            <Edit3 className="w-2.5 h-2.5" />
                          ) : (
                            <Eye className="w-2.5 h-2.5" />
                          )}
                          {col.role === "editor" ? "Editor" : "Viewer"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer: Copy Link & Done */}
        <div className="flex items-center justify-between pt-3 border-t border-(--border-subtle)">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted) rounded-lg border border-(--border-subtle) transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-(--text-tertiary)" />
                <span>Copy Document Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-(--bg-surface-muted) hover:bg-(--border-subtle) text-(--text-primary) rounded-lg transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
