"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History,
  X,
  RotateCcw,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { AccessRole } from "@/lib/db/documents";
import { hasPermission } from "@/lib/auth/permissions";

export interface VersionItem {
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  content: string;
  jsonContent?: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl?: string | null;
  };
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  currentVersion: number;
  accessRole: AccessRole;
  onRestore: (versionNumber: number) => Promise<boolean>;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  documentId,
  currentVersion,
  accessRole,
  onRestore,
}: VersionHistoryModalProps) {
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmRestoreNumber, setConfirmRestoreNumber] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canRestore = hasPermission(accessRole, "restore_version");

  const fetchVersions = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    setErrorMessage("");
    setConfirmRestoreNumber(null);
    setSuccessMessage("");
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`);
      if (res.ok) {
        const json = await res.json();
        const list: VersionItem[] = json.data || [];
        setVersions(list);
        if (list.length > 0) {
          setSelectedVersion(list[0]);
        }
      } else {
        const err = await res.json().catch(() => null);
        setErrorMessage(err?.error || "Failed to load version history");
      }
    } catch {
      setErrorMessage("Network error fetching version history");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (isOpen) {
      void fetchVersions();
    }
  }, [isOpen, fetchVersions]);

  if (!isOpen) return null;

  const handleConfirmRestore = async () => {
    if (confirmRestoreNumber === null) return;
    setIsRestoring(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const success = await onRestore(confirmRestoreNumber);
      if (success) {
        setSuccessMessage(`Successfully restored Version ${confirmRestoreNumber}!`);
        setConfirmRestoreNumber(null);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setErrorMessage("Failed to restore version. Please try again.");
      }
    } catch {
      setErrorMessage("Unexpected error during restore.");
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border-subtle) bg-white/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-(--text-primary)">
                Document Version History
              </h2>
              <p className="text-xs text-(--text-tertiary)">
                Inspect immutable past snapshots, preview historical edits, or restore
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted) rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Body: Sidebar (Version List) + Content Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Version List Sidebar */}
          <div className="w-full md:w-80 border-r border-(--border-subtle) flex flex-col bg-slate-50/50">
            <div className="p-3 border-b border-(--border-subtle) flex items-center justify-between text-xs text-(--text-secondary) font-medium">
              <span>Versions ({versions.length})</span>
              <span className="text-[11px] text-(--text-tertiary)">Newest first</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-(--text-tertiary) text-xs gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Loading version history...</span>
                </div>
              )}

              {!isLoading && versions.length === 0 && (
                <div className="p-6 text-center text-xs text-(--text-tertiary)">
                  No version snapshots recorded yet.
                </div>
              )}

              {!isLoading &&
                versions.map((ver) => {
                  const isSelected = selectedVersion?.id === ver.id;
                  const isCurrent = ver.versionNumber === currentVersion;
                  const authorName = ver.changedBy?.name || ver.changedBy?.email || "Unknown Author";

                  return (
                    <button
                      key={ver.id}
                      onClick={() => {
                        setSelectedVersion(ver);
                        setConfirmRestoreNumber(null);
                      }}
                      className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border ${
                        isSelected
                          ? "bg-white border-blue-200 shadow-xs ring-1 ring-blue-500/20"
                          : "border-transparent hover:bg-white/80 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                          Version {ver.versionNumber}
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              Current
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-(--text-tertiary)">
                          <Clock className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                          {formatDate(ver.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                          {ver.changedBy?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ver.changedBy.avatarUrl}
                              alt={authorName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            authorName.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="text-xs text-(--text-secondary) truncate">
                          {authorName}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Preview & Restore Action Pane */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            {selectedVersion ? (
              <>
                {/* Preview Topbar */}
                <div className="p-4 border-b border-(--border-subtle) flex items-center justify-between bg-slate-50/40">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Eye className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-(--text-primary)">
                        Previewing Version {selectedVersion.versionNumber}
                      </h4>
                      <p className="text-[11px] text-(--text-tertiary)">
                        Saved on {formatDate(selectedVersion.createdAt)} by{" "}
                        {selectedVersion.changedBy?.name || selectedVersion.changedBy?.email}
                      </p>
                    </div>
                  </div>

                  {/* Restore CTA */}
                  {canRestore ? (
                    <button
                      onClick={() => setConfirmRestoreNumber(selectedVersion.versionNumber)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore this version</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-(--text-tertiary) italic px-2 py-1 bg-slate-100 rounded">
                      Read-only (Viewers cannot restore)
                    </span>
                  )}
                </div>

                {/* Historical Preview Content (Read Only) */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-3xl mx-auto space-y-4">
                    <h1 className="text-2xl font-bold text-slate-800 pb-2 border-b border-slate-100">
                      {selectedVersion.title || "Untitled Document"}
                    </h1>
                    <div
                      className="prose prose-slate max-w-none text-slate-700 text-sm leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: selectedVersion.content || "<p><em>Empty content</em></p>",
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-(--text-tertiary)">
                Select a version from the left panel to preview.
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Modal for Restore */}
        {confirmRestoreNumber !== null && (
          <div className="absolute inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
            <div className="bg-white border border-(--border-subtle) rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Restore Version {confirmRestoreNumber}?
                  </h3>
                  <p className="text-xs text-slate-500">
                    This will replace the live document content with Version {confirmRestoreNumber}.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                History is <strong>preserved</strong>: restoring creates a new version snapshot containing the historical text. All currently connected collaborators will receive the restored content in real time.
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmRestoreNumber(null)}
                  disabled={isRestoring}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  {isRestoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isRestoring ? "Restoring..." : "Yes, Restore Document"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
