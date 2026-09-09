"use client";

import { Trash2, AlertTriangle, X } from "lucide-react";

interface DeleteModalProps {
  isOpen: boolean;
  documentTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteDocumentModal({
  isOpen,
  documentTitle,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-(--bg-surface) border border-(--border-default) rounded-xl p-6 max-w-md w-full shadow-clarity space-y-4">
        <div className="flex items-start justify-between">
          <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <button
            onClick={onCancel}
            className="p-1 text-(--text-tertiary) hover:text-(--text-primary) rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h2 className="text-base font-semibold text-(--text-primary)">Delete Document</h2>
          <p className="text-xs text-(--text-secondary) mt-1 leading-relaxed">
            Are you sure you want to delete &quot;<span className="text-(--text-primary) font-medium">{documentTitle}</span>&quot;? This action cannot be undone.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-medium text-(--text-secondary) hover:bg-(--bg-surface-muted) hover:text-(--text-primary) rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-clarity"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? "Deleting..." : "Delete Document"}
          </button>
        </div>
      </div>
    </div>
  );
}
