"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { User, Mail, Calendar, ArrowLeft, Shield } from "lucide-react";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl shadow-sm dark:shadow-xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Avatar
            name={user.name}
            avatarUrl={user.avatar}
            size="lg"
            className="w-16 h-16 text-xl"
          />
          <div>
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">{user.name}</CardTitle>
            <CardDescription>{user.email}</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Full Name</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Mail className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Email Address</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.email}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Member Since</span>
              </div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{formatDate(user.createdAt)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4 space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Account Status</span>
              </div>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Active (Verified)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
