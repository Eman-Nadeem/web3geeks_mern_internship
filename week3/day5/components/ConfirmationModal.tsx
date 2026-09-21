'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, X, RefreshCw } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-500" />,
          iconBg: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
          btnBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
          iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
          btnBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/20',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-emerald-500" />,
          iconBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
          btnBg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-(--surface-card) border border-(--border-dark) rounded-3xl p-6 shadow-2xl space-y-5 text-left">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${styles.iconBg} shrink-0`}>
              {styles.icon}
            </div>
            <div>
              <h3 id="confirmation-modal-title" className="text-base font-bold text-(--text-on-dark)">
                {title}
              </h3>
              <p className="text-xs text-(--text-on-dark-muted) mt-0.5">Please confirm this action.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="p-1 rounded-lg text-(--text-on-dark-muted) hover:text-(--text-on-dark) transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-(--text-on-dark) leading-relaxed bg-(--surface-card-subtle) p-3.5 rounded-2xl border border-(--border-dark)">
          {message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-(--border-dark) bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-semibold text-(--text-on-dark) transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm ${styles.btnBg}`}
          >
            {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
