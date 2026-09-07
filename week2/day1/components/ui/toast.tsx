"use client";

import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useEffect } from "react";

export interface ToastProps {
  type: "success" | "error" | "info";
  message: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({ type, message, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: "bg-[var(--status-success-bg)] text-(--status-success) border-[var(--status-success)]/30",
    error: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-[var(--status-info-bg)] text-(--status-info) border-[var(--status-info)]/30",
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-(--status-success) shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
    info: <Info className="w-4 h-4 text-(--status-info) shrink-0" />,
  };

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-clarity transition-all duration-200 ${styles[type]}`}
    >
      {icons[type]}
      <span className="text-xs font-medium">{message}</span>
      <button
        onClick={onClose}
        className="p-1 hover:bg-black/5 rounded-sm transition-colors ml-2"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5 text-(--text-tertiary)" />
      </button>
    </div>
  );
}
