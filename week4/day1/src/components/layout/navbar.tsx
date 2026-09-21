"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OrgSwitcher } from "./org-switcher";
import { UserMenu } from "./user-menu";
import { Layers } from "lucide-react";

export function Navbar() {
  const params = useParams();
  const orgSlug = typeof params?.orgSlug === "string" ? params.orgSlug : undefined;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0b0f17]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 font-bold text-white tracking-tight text-base hover:opacity-90 transition-opacity"
          >
            <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <span className="hidden sm:inline">Team Collab SaaS</span>
          </Link>
        </div>

        {/* Center: Org switcher tabs */}
        <div className="flex-1 max-w-xl mx-2 hidden md:block">
          <OrgSwitcher currentOrgSlug={orgSlug} />
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-3">
          <UserMenu />
        </div>
      </div>

      {/* Mobile Org Switcher Row */}
      <div className="md:hidden border-t border-slate-800/80 px-4 py-2 bg-slate-900/40">
        <OrgSwitcher currentOrgSlug={orgSlug} />
      </div>
    </header>
  );
}
