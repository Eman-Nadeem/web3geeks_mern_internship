"use client";

import { useState, useEffect, useRef } from "react";
import { X, Check, Loader2, Sparkles, UploadCloud, Trash2 } from "lucide-react";
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
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setAvatarUrl(user.avatarUrl || "");
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setErrorMessage("");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      setAvatarUrl(data.url);
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to upload image to Cloudinary"
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
        {/* Header (clean title without extra profile icon) */}
        <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
          <h3 className="font-semibold text-base text-(--text-primary)">Edit Profile</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-(--text-tertiary) hover:text-(--text-primary) hover:bg-(--bg-surface-muted) rounded-lg transition-colors cursor-pointer"
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
              <div className="text-xs font-semibold text-(--text-primary)">{user?.name}</div>
              <div className="text-[11px] text-(--text-tertiary) truncate">
                {user?.email}
              </div>
            </div>
          </div>

          {/* Cloudinary Image Upload */}
          <div>
            <label className="text-xs font-semibold text-(--text-secondary) mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <UploadCloud className="w-3.5 h-3.5 text-(--accent-primary)" />
                Upload Profile Image
              </span>
              {avatarUrl && avatarUrl.includes("cloudinary") && (
                <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Image Uploaded Successfully!
                </span>
              )}
            </label>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-(--border-subtle) hover:border-(--accent-primary) rounded-xl p-4 text-center cursor-pointer transition-colors bg-(--bg-surface-muted) hover:bg-(--accent-soft-bg)/30 group"
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-1.5 py-1">
                  <Loader2 className="w-5 h-5 text-(--accent-primary) animate-spin" />
                  <span className="text-xs font-medium text-(--text-primary)">Uploading Image...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center text-(--accent-primary) group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-(--accent-primary) hover:underline">
                      Click to upload photo
                    </span>
                    <span className="text-xs text-(--text-secondary)"> or drag and drop</span>
                  </div>
                  <p className="text-[10px] text-(--text-tertiary)">
                    PNG, JPG, WEBP, or GIF (max 10MB) • Uploads &amp; saves live URL to database
                  </p>
                </div>
              )}
            </div>

            {avatarUrl && (
              <div className="mt-2 flex items-center justify-between text-[11px] bg-white border border-(--border-subtle) px-2.5 py-1.5 rounded-lg">
                <span className="text-(--text-secondary) truncate max-w-70" title={avatarUrl}>
                  {avatarUrl}
                </span>
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="text-slate-400 hover:text-rose-600 transition-colors ml-2 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Avatar Presets */}
          <div>
            <label className="text-xs font-semibold text-(--text-secondary) mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-(--accent-primary)" />
              Or Pick Preset Avatar
            </label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((preset) => {
                const isSelected = avatarUrl === preset.url;
                return (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => setAvatarUrl(preset.url)}
                    className={`p-1 rounded-xl border transition-all cursor-pointer ${
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
              disabled={isSaving || isUploading}
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
