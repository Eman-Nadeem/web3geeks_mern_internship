"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { ChevronDown, User, LogOut } from "lucide-react";

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Avatar name={user.name} avatarUrl={user.avatar} size="sm" />
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 hidden sm:inline">
          {user.name}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] p-1.5 shadow-xl z-50">
          <div className="px-3 py-2 border-b border-slate-200/80 dark:border-slate-800/60 mb-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
          >
            <User className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Profile</span>
          </Link>

          <button
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors text-left"
          >
            <LogOut className="w-4 h-4 text-red-500 dark:text-red-400" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
}
