"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Menu,
  X,
  Trash2,
  Clock,
  Command,
  LayoutGrid,
  Pencil,
  Check,
  LogOut,
  UserCircle2,
} from "lucide-react";
import { NewDocumentButton } from "./new-document-button";
import { DeleteDocumentModal } from "./delete-document-modal";
import { useAuth } from "@/lib/auth/context";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";

export interface DocumentItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface DocumentSidebarProps {
  initialDocuments?: DocumentItem[];
}

export function DocumentSidebar({ initialDocuments = [] }: DocumentSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { user, logout } = useAuth();

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const json = await res.json();
        setDocuments(json.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch documents sidebar:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const loadDocs = async () => {
      try {
        const res = await fetch("/api/documents");
        if (res.ok && isMounted) {
          const json = await res.json();
          setDocuments(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch documents sidebar:", err);
      }
    };
    void loadDocs();
    return () => {
      isMounted = false;
    };
  }, [pathname]);

  // Listen for title updates across components (e.g. editor header)
  useEffect(() => {
    const handleDocumentsUpdated = (event: Event) => {
      const customEv = event as CustomEvent<{ id?: string; title?: string }>;
      if (customEv.detail?.id && customEv.detail?.title !== undefined) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === customEv.detail.id
              ? { ...doc, title: customEv.detail.title! }
              : doc
          )
        );
      } else {
        fetchDocuments();
      }
    };

    window.addEventListener("documents-updated", handleDocumentsUpdated);
    return () => window.removeEventListener("documents-updated", handleDocumentsUpdated);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        const searchInput = document.getElementById("sidebar-search-input");
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartRename = (doc: DocumentItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const handleSaveRename = async (docId: string) => {
    const trimmed = editingTitle.trim() || "Untitled Document";
    setEditingId(null);

    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, title: trimmed } : d))
    );

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      if (res.ok) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("documents-updated", {
              detail: { id: docId, title: trimmed },
            })
          );
        }
        router.refresh();
      }
    } catch (err) {
      console.error("Failed to rename document from sidebar:", err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/documents/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("documents-updated", {
              detail: { id: deleteTarget.id, deleted: true },
            })
          );
        }
        router.refresh();
        if (pathname === `/documents/${deleteTarget.id}`) {
          router.push("/documents");
        }
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "Just now"
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-(--bg-surface) border-b border-(--border-subtle) sticky top-0 z-40 w-full">
        <div className="flex items-center gap-2 font-semibold text-(--text-primary) text-sm">
          <div className="w-6 h-6 rounded-full bg-(--accent-primary) text-white flex items-center justify-center text-xs font-bold">
            S
          </div>
          <span>SyncDocs</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-(--text-secondary) hover:text-(--text-primary) rounded-lg bg-(--bg-canvas) min-h-11 min-w-11 flex items-center justify-center transition-colors"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/30 backdrop-blur-xs z-40"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-64 bg-(--bg-surface) border-r border-(--border-subtle) flex flex-col transition-transform duration-200 ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
      >
        {/* Workspace Brand Header */}
        <div className="p-4 border-b border-(--border-subtle) flex items-center justify-between">
          <Link
            href="/documents"
            className="flex items-center gap-2.5 font-semibold text-sm text-(--text-primary) group"
          >
            <div className="w-7 h-7 rounded-lg bg-(--accent-soft-bg) text-(--accent-primary) flex items-center justify-center font-bold text-xs transition-colors group-hover:bg-(--accent-primary) group-hover:text-white">
              S
            </div>
            <div className="flex flex-col">
              <span className="leading-tight text-sm font-semibold tracking-[-0.01em]">SyncDocs</span>
              <span className="text-[11px] text-(--text-tertiary) font-normal">Workspace</span>
            </div>
          </Link>
        </div>

        {/* Action Button & Search */}
        <div className="p-3.5 space-y-3 border-b border-(--border-subtle)">
          <NewDocumentButton onSuccess={() => setIsOpen(false)} fullWidth />

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-(--text-tertiary) absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="sidebar-search-input"
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg pl-8 pr-12 py-1.5 text-base sm:text-xs text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary) transition-colors"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[10px] text-(--text-tertiary) bg-(--bg-surface) px-1.5 py-0.5 rounded border border-(--border-subtle) font-mono pointer-events-none">
              <Command className="w-2.5 h-2.5" />
              <span>F</span>
            </div>
          </div>
        </div>

        {/* Quick Nav Links */}
        <div className="px-3 pt-3 pb-1 space-y-0.5 border-b border-(--border-subtle)">
          <Link
            href="/documents"
            className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${pathname === "/documents"
                ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
                : "text-(--text-secondary) hover:bg-(--bg-surface-muted) hover:text-(--text-primary)"
              }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>All Documents</span>
          </Link>
        </div>

        {/* Document Navigation Tree */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Documents list">
          <div className="px-2 py-1 text-[11px] font-semibold text-(--text-tertiary) uppercase tracking-wider">
            Documents ({filteredDocs.length})
          </div>

          {filteredDocs.length === 0 ? (
            <div className="p-4 text-center text-xs text-(--text-tertiary) space-y-1">
              <p>No documents found</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isActive = pathname === `/documents/${doc.id}`;
              const isEditingThis = editingId === doc.id;

              return (
                <div
                  key={doc.id}
                  className={`group relative flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${isActive
                      ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
                      : "text-(--text-primary) hover:bg-(--bg-surface-muted)"
                    }`}
                >
                  {isEditingThis ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0 pr-1">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveRename(doc.id);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        autoFocus
                        className="w-full text-xs px-2 py-1 border border-(--accent-primary) rounded-md bg-white text-(--text-primary) focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveRename(doc.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors shrink-0"
                        title="Save rename"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors shrink-0"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        href={`/documents/${doc.id}`}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2 flex-1 min-w-0 pr-2"
                      >
                        <FileText
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-(--accent-primary)" : "text-(--text-secondary)"
                            }`}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{doc.title || "Untitled Document"}</span>
                          <span className="text-[11px] text-(--text-tertiary) font-normal flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDate(doc.updatedAt)}
                          </span>
                        </div>
                      </Link>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-all">
                        <button
                          onClick={(e) => handleStartRename(doc, e)}
                          className="p-1 text-(--text-tertiary) hover:text-(--accent-primary) hover:bg-(--accent-soft-bg) rounded transition-colors"
                          title="Rename document"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeleteTarget(doc);
                          }}
                          className="p-1 text-(--text-tertiary) hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </nav>

        {/* Sidebar Footer with User Profile and Actions */}
        <div className="p-3 border-t border-(--border-subtle) bg-(--bg-surface-muted) flex items-center justify-between text-xs shrink-0">
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2 min-w-0 cursor-pointer hover:opacity-85 transition-opacity"
            title="Click to edit profile & avatar"
          >
            <div className="relative shrink-0">
              <div className="w-7 h-7 rounded-full bg-(--accent-soft-bg) text-(--accent-primary) flex items-center justify-center text-[10px] font-bold overflow-hidden border border-(--border-subtle)">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  (user?.name || "ME").slice(0, 2).toUpperCase()
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-(--status-success) ring-2 ring-white" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] font-semibold text-(--text-primary) truncate">
                {user?.name || "Collaborator"}
              </span>
              <span className="text-[10px] text-(--text-secondary) truncate">
                {user?.email || "Signed in"}
              </span>
            </div>
          </div>

          <div className="flex items-center shrink-0">
            <button
              onClick={logout}
              className="p-1.5 text-(--text-tertiary) hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Delete Confirmation Dialog */}
      <DeleteDocumentModal
        isOpen={Boolean(deleteTarget)}
        documentTitle={deleteTarget?.title || ""}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
