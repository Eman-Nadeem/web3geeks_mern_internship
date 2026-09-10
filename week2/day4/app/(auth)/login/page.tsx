"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      await refreshUser();
      router.push("/documents");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-(--bg-canvas)">
      <div className="w-full max-w-md bg-(--bg-surface) border border-(--border-subtle) rounded-2xl p-8 shadow-clarity space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-(--accent-soft-bg) text-(--accent-primary) font-bold text-lg flex items-center justify-center mx-auto shadow-sm">
            S
          </div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-(--text-primary)">
            Welcome back to SyncDocs
          </h1>
          <p className="text-xs text-(--text-secondary)">
            Sign in to access your real-time collaborative workspace.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Demo Credentials Quick-Fill Pill */}
        <div className="p-3 bg-(--bg-surface-muted) border border-(--border-subtle) rounded-xl flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="font-semibold text-(--text-primary)">Demo Account</span>
            <span className="text-[11px] text-(--text-tertiary)">demo@example.com • Password123!</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmail("demo@example.com");
              setPassword("Password123!");
            }}
            className="px-2.5 py-1 text-xs font-semibold text-(--accent-primary) bg-(--accent-soft-bg) hover:bg-(--accent-primary) hover:text-white rounded-md transition-colors cursor-pointer"
          >
            Fill Demo
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-(--text-tertiary) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary) transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-(--text-tertiary) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary) transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-(--accent-primary) hover:bg-(--accent-primary-hover) text-white font-semibold text-xs rounded-lg shadow-clarity flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-(--border-subtle)">
          <p className="text-xs text-(--text-secondary)">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-(--accent-primary) hover:underline font-semibold"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
