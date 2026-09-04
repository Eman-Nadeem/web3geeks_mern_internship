'use client';

import React from 'react';

export interface NotificationPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Array<{
    _id: string;
    title: string;
    message: string;
    type: string;
    isRead?: boolean;
    read?: boolean;
    createdAt: string;
  }>;
  onMarkAsRead: (id: string) => void;
}

export default function NotificationPopover({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
}: NotificationPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-8 top-16 z-50 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <h3 className="text-xs font-bold text-slate-900 tracking-tight">Notifications</h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 text-xs font-bold p-1"
        >
          ✕
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {notifications.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No notifications found
          </div>
        ) : (
          notifications.map((n) => {
            const unread = !(n.isRead ?? n.read ?? false);
            return (
              <div
                key={n._id}
                className={`p-3.5 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3 ${
                  unread ? 'bg-orange-50/40' : ''
                }`}
              >
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">{n.title}</p>
                  <p className="text-[11px] text-slate-600 leading-snug">{n.message}</p>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {unread && (
                  <button
                    onClick={() => onMarkAsRead(n._id)}
                    title="Mark as read"
                    className="w-2 h-2 rounded-full bg-[#FF6B2C] shrink-0 mt-1 hover:scale-125 transition-transform"
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
