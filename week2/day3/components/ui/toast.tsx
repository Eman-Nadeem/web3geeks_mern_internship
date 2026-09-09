"use client";

import { CheckCircle2, AlertCircle, Info, X, UserPlus, UserMinus } from "lucide-react";
import { useEffect } from "react";

export interface ToastItem {
  id: string;
  type: "success" | "error" | "info" | "user_joined" | "user_left";
  title?: string;
  message: string;
  userName?: string;
  avatarUrl?: string | null;
  duration?: number;
}

export interface ToastProps {
  id?: string;
  type: "success" | "error" | "info" | "user_joined" | "user_left";
  title?: string;
  message: string;
  userName?: string;
  avatarUrl?: string | null;
  onClose: () => void;
  duration?: number;
}

function getInitials(name?: string): string {
  if (!name) return "U";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Toast({
  type,
  title,
  message,
  userName,
  avatarUrl,
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: "bg-emerald-50 text-emerald-900 border-emerald-200",
    error: "bg-rose-50 text-rose-900 border-rose-200",
    info: "bg-blue-50 text-blue-900 border-blue-200",
    user_joined: "bg-white text-slate-900 border-emerald-300 shadow-lg shadow-emerald-500/10",
    user_left: "bg-white text-slate-800 border-slate-200 shadow-md",
  };

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-3 duration-200 max-w-sm w-full shadow-clarity ${styles[type]}`}
    >
      {/* Icon or Avatar with Presence Status */}
      <div className="relative shrink-0 mt-0.5">
        {avatarUrl ? (
          <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatarUrl} alt={userName || "Collaborator"} className="w-full h-full object-cover" />
          </div>
        ) : type === "user_joined" || type === "user_left" ? (
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs border ${
              type === "user_joined"
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            {userName ? getInitials(userName) : type === "user_joined" ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
          </div>
        ) : type === "success" ? (
          <div className="p-1 rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        ) : type === "error" ? (
          <div className="p-1 rounded-full bg-rose-100 text-rose-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        ) : (
          <div className="p-1 rounded-full bg-blue-100 text-blue-600">
            <Info className="w-4 h-4" />
          </div>
        )}

        {/* Presence indicator badge */}
        {type === "user_joined" && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
          </span>
        )}
        {type === "user_left" && (
          <span className="absolute -bottom-0.5 -right-0.5 inline-flex rounded-full h-2.5 w-2.5 bg-slate-400 border border-white"></span>
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0 pr-1">
        {title ? (
          <div className="text-xs font-semibold tracking-tight text-slate-900 flex items-center gap-1.5">
            {title}
            {type === "user_joined" && (
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                Online
              </span>
            )}
          </div>
        ) : null}
        <p className="text-xs leading-snug text-slate-600 mt-0.5 font-medium">
          {message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="p-1 -mr-1 -mt-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
