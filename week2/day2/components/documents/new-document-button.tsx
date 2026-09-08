"use client";

import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewDocumentButtonProps {
  onSuccess?: () => void;
  showText?: boolean;
}

export function NewDocumentButton({
  onSuccess,
  showText = true,
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

  return (
    <button
      onClick={handleCreate}
      disabled={isCreating}
      title="Create new document"
      aria-label="Create new document"
      className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60 cursor-pointer"
    >
      {isCreating ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Plus className="w-4 h-4 stroke-[2.5]" />
      )}
      {showText && <span>New Doc</span>}
    </button>
  );
}
