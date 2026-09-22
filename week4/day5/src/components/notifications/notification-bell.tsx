"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Inbox, Loader2, ExternalLink } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationDTO } from "@/types";

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
  } = useNotifications(1, unreadOnly);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-btn"
        aria-label="Open notifications"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-blue-600 rounded-full border-2 border-white dark:border-[#0b0f17] animate-in zoom-in duration-150">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUnreadOnly((prev) => !prev)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  unreadOnly
                    ? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-medium"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                {unreadOnly ? "Show all" : "Unread only"}
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  title="Mark all as read"
                  className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="sr-only sm:not-sr-only">Read all</span>
                </button>
              )}
            </div>
          </div>

          {/* List content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs">Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-2">
                  <Inbox className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {unreadOnly ? "No unread notifications" : "All caught up!"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  You have no new alerts right now.
                </p>
              </div>
            ) : (
              notifications.map((n: NotificationDTO) => (
                <NotificationItem
                  key={n.id}
                  item={n}
                  onMarkRead={() => markRead(n.id)}
                  onNavigate={() => {
                    if (!n.isRead) markRead(n.id);
                    setIsOpen(false);
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  item,
  onMarkRead,
  onNavigate,
}: {
  item: NotificationDTO;
  onMarkRead: () => void;
  onNavigate: () => void;
}) {
  const content = (
    <div
      className={`group relative p-3.5 flex items-start gap-3 transition-colors ${
        !item.isRead
          ? "bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-950/30"
          : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
      }`}
    >
      {/* Unread indicator */}
      <div className="pt-1 flex-shrink-0">
        {!item.isRead ? (
          <span className="block w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
        ) : (
          <span className="block w-2 h-2 rounded-full bg-transparent" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1 mb-0.5">
          <p className={`text-xs truncate ${!item.isRead ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-300"}`}>
            {item.title}
          </p>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
            {formatRelativeTime(item.createdAt)}
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {item.body}
        </p>

        {item.link && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline">
            <span>View details</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        )}
      </div>

      {/* Mark read action for unread */}
      {!item.isRead && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
          title="Mark as read"
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 shrink-0"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  if (item.link) {
    return (
      <Link href={item.link} onClick={onNavigate} className="block text-left">
        {content}
      </Link>
    );
  }

  return <div onClick={onMarkRead} className="cursor-pointer">{content}</div>;
}
