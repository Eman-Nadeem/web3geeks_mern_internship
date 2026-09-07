"use client";

import { Plus, Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NewDocumentButtonProps {
  onSuccess?: () => void;
  showSparkleAffordance?: boolean;
}

export function NewDocumentButton({
  onSuccess,
  showSparkleAffordance = true,
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
    <div className="flex items-center gap-2">
      {/* Primary + New Doc CTA */}
      <button
        onClick={handleCreate}
        disabled={isCreating}
        className="flex-1 bg-(--accent-primary) hover:bg-(--accent-primary-hover) text-white font-medium text-sm px-3.5 py-2 rounded-lg shadow-clarity flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {isCreating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating...</span>
          </>
        ) : (
          <>
            <Plus className="w-4 h-4" />
            <span>New Doc</span>
          </>
        )}
      </button>

      {/* Coral-Pink Gradient Sparkle Affordance Button (AI / Assistant Action) */}
      {showSparkleAffordance && (
        <button
          onClick={handleCreate}
          disabled={isCreating}
          title="Create with AI Assist"
          className="p-2 rounded-lg text-white shadow-clarity flex items-center justify-center transition-opacity hover:opacity-90 active:scale-[0.97] cursor-pointer"
          style={{ background: "var(--gradient-cta)" }}
        >
          <Sparkles className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
