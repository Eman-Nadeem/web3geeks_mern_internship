'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, ArrowRight, User } from 'lucide-react';

interface AuthGuardPromptProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export function AuthGuardPrompt({
  title,
  description,
  icon,
}: AuthGuardPromptProps) {
  return (
    <div className="w-full min-h-[70vh] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12 bg-(--bg-canvas) text-(--text-on-dark) transition-colors duration-200">
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E7EB] p-8 text-center shadow-sm space-y-5 text-[#151A24]">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#1E7A56] mx-auto">
          {icon || <Lock className="w-6 h-6" />}
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#151A24] tracking-tight">
            {title}
          </h2>
          <p className="text-[13px] text-[#6B7280] leading-relaxed">
            {description}
          </p>
        </div>

        {/* Primary CTA */}
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full py-2.5 px-4 rounded-lg bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] text-white text-[14px] font-semibold transition-colors duration-150 shadow-xs flex items-center justify-center gap-2"
          >
            <span>Sign In to Continue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Register link */}
        <div className="pt-2 border-t border-[#E5E7EB] text-[13px] text-[#6B7280]">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#1E7A56] hover:underline font-semibold">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
