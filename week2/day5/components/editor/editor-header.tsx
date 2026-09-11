"use client";

import { useState } from "react";
import {
  Loader2,
  Wifi,
  WifiOff,
  LogOut,
  UserCircle2,
  UserPlus,
  Eye,
  ChevronDown,
  Tag,
  CheckCircle2,
  History,
} from "lucide-react";
import { ConnectionState } from "@/lib/realtime/use-document-socket";
import { Collaborator, PresenceUser } from "@/lib/realtime/events";
import { AccessRole, VALID_STATUSES, VALID_CATEGORIES } from "@/lib/db/documents";
import { hasPermission } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/context";
import { EditProfileModal } from "@/components/profile/edit-profile-modal";
import { ShareDocumentModal } from "@/components/documents/share-document-modal";
import { VersionHistoryModal } from "./version-history-modal";

interface EditorHeaderProps {
  documentId?: string;
  initialTitle: string;
  status?: string;
  category?: string;
  saveStatus: "saved" | "saving" | "error" | "conflict";
  connectionState: ConnectionState;
  activeUsers: Collaborator[];
  presenceUsers?: PresenceUser[];
  documentVersion?: number;
  accessRole?: AccessRole;
  ownerName?: string;
  ownerEmail?: string;
  ownerAvatarUrl?: string | null;
  onTitleChange: (newTitle: string) => void;
  onStatusChange?: (newStatus: string) => void;
  onCategoryChange?: (newCategory: string) => void;
  onRestore?: (versionNumber: number) => Promise<boolean>;
}

export function EditorHeader({
  documentId = "",
  initialTitle,
  status = "Draft",
  category = "General",
  saveStatus,
  connectionState,
  activeUsers,
  presenceUsers = [],
  documentVersion,
  accessRole = "owner",
  ownerName = "Owner",
  ownerEmail,
  ownerAvatarUrl,
  onTitleChange,
  onStatusChange,
  onCategoryChange,
  onRestore,
}: EditorHeaderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [prevInitialTitle, setPrevInitialTitle] = useState(initialTitle);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const isViewer = !hasPermission(accessRole, "edit_document");
  const canShare = hasPermission(accessRole, "share_document");
  const isOwner = accessRole === "owner";

  // Derive list of collaborators: prefer deduplicated presenceUsers if available, else activeUsers
  const displayUsers =
    presenceUsers && presenceUsers.length > 0
      ? presenceUsers.map((p) => ({
          id: p.userId,
          name: p.displayName,
          color: p.color,
          avatarUrl: p.avatarUrl,
        }))
      : activeUsers.map((a) => ({
          id: a.id,
          name: a.name,
          color: a.color || "#3b82f6",
          avatarUrl: a.avatarUrl,
        }));

  if (initialTitle !== prevInitialTitle) {
    setPrevInitialTitle(initialTitle);
    setTitle(initialTitle);
  }

  const handleTitleBlur = () => {
    if (!isViewer && title !== initialTitle) {
      onTitleChange(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  // Status Badge Styling
  const statusStyles: Record<string, string> = {
    Complete: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    "In Review": "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    Draft: "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200",
  };

  // Connection badge config
  const connectionConfig = {
    connected: {
      label: "Live Sync",
      dotClass: "bg-(--status-success)",
      icon: Wifi,
      textClass: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
    connecting: {
      label: "Connecting...",
      dotClass: "bg-amber-400 animate-pulse",
      icon: Loader2,
      textClass: "text-amber-700 bg-amber-50 border-amber-200",
    },
    reconnecting: {
      label: "Reconnecting...",
      dotClass: "bg-amber-500 animate-spin",
      icon: Loader2,
      textClass: "text-amber-700 bg-amber-50 border-amber-200",
    },
    disconnected: {
      label: "Offline",
      dotClass: "bg-rose-500",
      icon: WifiOff,
      textClass: "text-rose-700 bg-rose-50 border-rose-200",
    },
  }[connectionState];

  return (
    <>
      <header className="h-14 px-3 sm:px-6 bg-(--bg-surface) border-b border-(--border-subtle) flex items-center justify-between sticky top-0 z-30 shadow-clarity">
        {/* Title Input & Status/Category Tags */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-2xl min-w-0">
          <input
            type="text"
            value={title}
            disabled={isViewer}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleKeyDown}
            aria-label="Document Title"
            className={`text-base sm:text-sm font-semibold text-(--text-primary) placeholder-(--text-tertiary) bg-transparent focus:outline-none px-2 py-1 rounded-md transition-colors flex-1 min-w-0 truncate ${
              isViewer
                ? "cursor-not-allowed text-slate-500 bg-slate-50/50"
                : "focus:bg-(--bg-surface-muted)"
            }`}
            placeholder="Untitled Document"
          />

          {/* Interactive Category Dropdown (or read-only badge for viewers) */}
          <div className="relative shrink-0">
            {isViewer ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-(--bg-surface-muted) text-(--text-secondary) border border-(--border-subtle)">
                <Tag className="w-2.5 h-2.5" />
                {category}
              </span>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryMenuOpen(!isCategoryMenuOpen);
                    setIsStatusMenuOpen(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-(--bg-surface-muted) hover:bg-slate-200/70 text-(--text-secondary) hover:text-(--text-primary) border border-(--border-subtle) transition-colors cursor-pointer"
                  title="Change Category"
                >
                  <Tag className="w-2.5 h-2.5" />
                  <span>{category}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {isCategoryMenuOpen && (
                  <div className="absolute left-0 mt-1 w-36 bg-white border border-(--border-subtle) rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Category
                    </div>
                    {VALID_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          onCategoryChange?.(cat);
                          setIsCategoryMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          category === cat ? "font-semibold text-blue-600" : "text-slate-700"
                        }`}
                      >
                        <span>{cat}</span>
                        {category === cat && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Status Dropdown (or read-only badge for viewers) */}
          <div className="relative shrink-0">
            {isViewer ? (
              <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-md border ${statusStyles[status] || statusStyles.Draft}`}>
                {status}
              </span>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setIsStatusMenuOpen(!isStatusMenuOpen);
                    setIsCategoryMenuOpen(false);
                  }}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                    statusStyles[status] || statusStyles.Draft
                  }`}
                  title="Change Document Status"
                >
                  <span>{status}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {isStatusMenuOpen && (
                  <div className="absolute left-0 mt-1 w-36 bg-white border border-(--border-subtle) rounded-lg shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Status
                    </div>
                    {VALID_STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          onStatusChange?.(st);
                          setIsStatusMenuOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          status === st ? "font-semibold text-blue-600" : "text-slate-700"
                        }`}
                      >
                        <span>{st}</span>
                        {status === st && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Viewer Mode Badge */}
          {isViewer && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold shrink-0">
              <Eye className="w-3 h-3 text-slate-500" />
              <span>Read-Only</span>
            </div>
          )}

          {/* Connection State Badge */}
          <div
            className={`hidden lg:flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium shrink-0 ${connectionConfig.textClass}`}
            title={`Real-time status: ${connectionConfig.label}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${connectionConfig.dotClass}`} />
            <span>{connectionConfig.label}</span>
          </div>

          {/* Sync Version Badge */}
          {documentVersion !== undefined && (
            <span
              className="hidden xl:inline-flex items-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0"
              title={`Document synchronization version: ${documentVersion}`}
            >
              v{documentVersion}
            </span>
          )}

          {/* Quiet Inline Autosave Indicator (hidden for viewers) */}
          {!isViewer && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-(--text-tertiary) shrink-0 font-medium">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-(--accent-primary)" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-(--status-success)" />
                  <span>Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-rose-600">Save Error</span>
                </>
              )}
              {saveStatus === "conflict" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-amber-600 font-medium">Conflict</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Header: Active Collaborators, Share Button & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Active Collaborators Count and Avatars */}
          <div className="flex items-center gap-1.5">
            {displayUsers.length > 0 && (
              <span className="hidden md:inline text-[11px] font-medium text-(--text-tertiary) mr-1">
                {displayUsers.length} active
              </span>
            )}
            <div className="flex items-center -space-x-1.5 overflow-hidden">
              {displayUsers.length === 0 && user && (
                <div
                  className="w-7 h-7 rounded-full border-2 bg-(--accent-primary) text-white text-[11px] font-bold flex items-center justify-center overflow-hidden shadow-xs relative"
                  style={{ borderColor: "#3b82f6" }}
                  title={`${user.name} (You)`}
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.slice(0, 2).toUpperCase()
                  )}
                </div>
              )}

              {displayUsers.map((collaborator) => {
                const isCurrentUser = collaborator.id === user?.id;
                return (
                  <div
                    key={collaborator.id}
                    className="w-7 h-7 rounded-full border-2 bg-white text-slate-700 text-[11px] font-bold flex items-center justify-center overflow-hidden shadow-xs transition-transform hover:scale-110 hover:z-10 relative"
                    style={{ borderColor: collaborator.color }}
                    title={`${collaborator.name}${isCurrentUser ? " (You)" : ""}`}
                  >
                    {collaborator.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={collaborator.avatarUrl}
                        alt={collaborator.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      collaborator.name.slice(0, 2).toUpperCase()
                    )}
                    <span
                      className="absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white"
                      style={{ backgroundColor: collaborator.color }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Viewer Badge */}
          {isViewer && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-700">
              <Eye className="w-3.5 h-3.5" />
              <span>Viewer (Read Only)</span>
            </div>
          )}

          {/* History Button (Owner, Editor, Viewer) */}
          {documentId && (
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all cursor-pointer shadow-xs"
              title="View document version history"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
          )}

          {/* Share Button (Gated via unified permission matrix: share_document action) */}
          {documentId && canShare && (
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold bg-(--accent-soft-bg) text-(--accent-primary) hover:bg-(--accent-primary) hover:text-white transition-all cursor-pointer shadow-xs"
              title="Share document and manage collaborators"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <div className="h-4 w-px bg-(--border-subtle)" />

          {/* User Profile Trigger & Logout */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted) transition-colors cursor-pointer"
              title="Edit your profile and avatar"
            >
              <UserCircle2 className="w-4 h-4 text-(--accent-primary)" />
              <span className="hidden md:inline truncate max-w-22.5">{user?.name || "Profile"}</span>
            </button>

            <button
              onClick={logout}
              className="p-1.5 text-(--text-tertiary) hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal */}
      <EditProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

      {/* Share Document Modal */}
      {documentId && isOwner && (
        <ShareDocumentModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          documentId={documentId}
          documentTitle={title}
          isOwner={isOwner}
          ownerName={ownerName}
          ownerEmail={ownerEmail}
          ownerAvatarUrl={ownerAvatarUrl}
        />
      )}

      {/* Version History Modal */}
      {documentId && onRestore && (
        <VersionHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          documentId={documentId}
          currentVersion={documentVersion || 1}
          accessRole={accessRole}
          onRestore={onRestore}
        />
      )}
    </>
  );
}

