'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`relative p-2 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-700/80 text-amber-400 hover:bg-slate-800 hover:text-amber-300'
          : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-100 hover:text-indigo-700 shadow-sm'
      } ${className}`}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Moon className="w-4 h-4 transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>
    </button>
  );
}
