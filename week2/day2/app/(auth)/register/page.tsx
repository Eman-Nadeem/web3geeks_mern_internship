"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Lock, Mail, User, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

const PRESET_AVATARS = [
  { label: "Bot Blue", url: "https://api.dicebear.com/7.x/bottts/svg?seed=BlueBot" },
  { label: "Bot Neon", url: "https://api.dicebear.com/7.x/bottts/svg?seed=NeonByte" },
  { label: "Human Teal", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=TealExplorer" },
  { label: "Human Violet", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=VioletCoder" },
];

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(PRESET_AVATARS[0].url);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { refreshUser } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, avatarUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create account");
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
            Create your SyncDocs account
          </h1>
          <p className="text-xs text-(--text-secondary)">
            Start collaborating in real-time with your team.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-(--text-tertiary) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="w-full pl-9 pr-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary) transition-colors"
              />
            </div>
          </div>

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
                placeholder="sarah@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary) transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5">
              Password (min 6 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-(--text-tertiary) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary) transition-colors"
              />
            </div>
          </div>

          {/* Avatar Selection */}
          <div>
            <label className="text-xs font-semibold text-(--text-secondary) mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-(--accent-primary)" />
              Choose Collaborator Avatar
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`p-1.5 rounded-xl border transition-all ${
                      isSelected
                        ? "border-(--accent-primary) bg-(--accent-soft-bg) scale-105 shadow-sm"
                        : "border-(--border-subtle) hover:border-(--text-tertiary)"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset.url} alt={preset.label} className="w-9 h-9 mx-auto" />
                  </button>
                );
              })}
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
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-(--border-subtle)">
          <p className="text-xs text-(--text-secondary)">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-(--accent-primary) hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
