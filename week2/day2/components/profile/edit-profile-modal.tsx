"use client";

import { useState, useEffect } from "react";
import { X, Check, Loader2, UserCircle2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/context";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AVATARS = [
  { label: "Bot Blue", url: "https://api.dicebear.com/7.x/bottts/svg?seed=BlueBot" },
  { label: "Bot Neon", url: "https://api.dicebear.com/7.x/bottts/svg?seed=NeonByte" },
  { label: "Bot Crimson", url: "https://api.dicebear.com/7.x/bottts/svg?seed=Crimson" },
  { label: "Human Teal", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=TealExplorer" },
  { label: "Human Violet", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=VioletCoder" },
  { label: "Human Amber", url: "https://api.dicebear.com/7.x/avataaars/svg?seed=AmberDesigner" },
];

export function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Name cannot be empty");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    const result = await updateProfile({
      name: name.trim(),
      avatarUrl: avatarUrl.trim() || undefined,
    });

    setIsSaving(false);
    if (result.success) {
      onClose();
    } else {
      setErrorMessage(result.error || "Failed to update profile");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl w-full max-w-md p-6 shadow-clarity space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
          <div className="flex items-center gap-2">
            <UserCircle2 className="w-5 h-5 text-(--accent-primary)" />
            <h3 className="font-semibold text-base text-(--text-primary)">Edit Profile</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted) rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Avatar Preview */}
          <div className="flex items-center gap-4 p-3 bg-(--bg-surface-muted) rounded-xl border border-(--border-subtle)">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-(--accent-primary) shrink-0 bg-white flex items-center justify-center shadow-sm">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  onError={() => {
                    // Fallback if image fails to load
                  }}
                />
              ) : (
                <div className="text-base font-bold text-(--accent-primary)">
                  {name.slice(0, 2).toUpperCase() || "ME"}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-(--text-primary)">Active Collaborator Avatar</div>
              <div className="text-[11px] text-(--text-tertiary) truncate">
                Displayed in active document rooms and collaboration badges.
              </div>
            </div>
          </div>

          {/* Quick Avatar Presets */}
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-(--accent-primary)" />
              Choose Preset Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`p-1 rounded-xl border transition-all ${
                      isSelected
                        ? "border-(--accent-primary) bg-(--accent-soft-bg) scale-105 shadow-sm"
                        : "border-(--border-subtle) hover:border-(--text-tertiary)"
                    }`}
                    title={preset.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preset.url} alt={preset.label} className="w-8 h-8 mx-auto" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar URL */}
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
              Or Custom Image URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full px-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-(--accent-primary)"
            />
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg text-(--text-primary) focus:outline-none focus:border-(--accent-primary)"
              placeholder="Your Full Name"
            />
          </div>

          {/* Readonly Email */}
          <div>
            <label className="block text-xs font-semibold text-(--text-secondary) mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3 py-2 text-xs bg-(--bg-canvas) border border-(--border-subtle) rounded-lg text-(--text-tertiary) cursor-not-allowed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-(--border-subtle)">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted) rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-medium bg-(--accent-primary) hover:bg-(--accent-primary-hover) text-white rounded-lg shadow-clarity flex items-center gap-1.5 disabled:opacity-60 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
