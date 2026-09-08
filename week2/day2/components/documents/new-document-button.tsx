"use client";

import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewDocumentButtonProps {
  onSuccess?: () => void;
  showText?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export function NewDocumentButton({
  onSuccess,
  showText = true,
  fullWidth = false,
  className = "",
}: NewDocumentButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled Document" }),
      });

      if (!response.ok) {
        throw new Error("Failed to create document");
      }

      const { data } = await response.json();
      if (onSuccess) onSuccess();
      router.push(`/documents/${data.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create document. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const baseStyle =
    "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold transition-all flex items-center justify-center active:scale-95 disabled:opacity-60 cursor-pointer shadow-sm hover:shadow";

  if (!showText) {
    // Compact icon-only "+" button (matches stats card height)
    return (
      <button
        onClick={handleCreate}
        disabled={isCreating}
        title="Create new document"
        aria-label="Create new document"
        className={`${baseStyle} w-11 h-11 rounded-xl shrink-0 ${className}`}
      >
        {isCreating ? (
          <Loader2 className="w-5 h-14 animate-spin" />
        ) : (
          <Plus className="w-5 h-14 stroke-[2.5]" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      title="Create new document"
      aria-label="Create new document"
      className={`${baseStyle} ${
        fullWidth
          ? "w-full py-2.5 px-4 text-sm rounded-xl gap-2"
          : "text-xs sm:text-sm px-3.5 py-2 rounded-xl gap-1.5"
      } ${className}`}
    >
      {isCreating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Plus className="w-4 h-4 stroke-[2.5]" />
      )}
      <span>New Doc</span>
    </button>
  );
}
