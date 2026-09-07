"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface EditorHeaderProps {
  documentId?: string;
  initialTitle: string;
  saveStatus: "saved" | "saving" | "error";
  onTitleChange: (newTitle: string) => void;
}

export function EditorHeader({
  initialTitle,
  saveStatus,
  onTitleChange,
}: EditorHeaderProps) {
  const [title, setTitle] = useState(initialTitle);
  const [prevInitialTitle, setPrevInitialTitle] = useState(initialTitle);

  if (initialTitle !== prevInitialTitle) {
    setPrevInitialTitle(initialTitle);
    setTitle(initialTitle);
  }


  const handleTitleBlur = () => {
    if (title !== initialTitle) {
      onTitleChange(title);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  return (
    <header className="h-14 px-3 sm:px-6 bg-(--bg-surface) border-b border-(--border-subtle) flex items-center justify-between sticky top-0 z-30 shadow-clarity">
      {/* Title Input & Quiet Autosave Indicator */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-2xl min-w-0">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleKeyDown}
          aria-label="Document Title"
          className="text-base sm:text-sm font-semibold text-(--text-primary) placeholder-(--text-tertiary) bg-transparent focus:outline-none focus:bg-(--bg-surface-muted) px-2 py-1 rounded-md transition-colors flex-1 min-w-0 truncate"
          placeholder="Untitled Document"
        />

        {/* Quiet Inline Autosave Indicator */}
        <div className="flex items-center gap-1.5 text-xs text-(--text-tertiary) shrink-0 font-medium">
          {saveStatus === "saving" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-(--accent-primary)" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-(--status-success)" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-rose-600">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Right Header Utility Cluster & Presence Avatars */}
      <div className="flex items-center gap-4">
        {/* Real-time Presence Stacked Avatars */}
        <div className="flex items-center -space-x-1.5">
          <div
            className="w-7 h-7 rounded-full bg-(--accent-primary) text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white"
            title="Demo Architect (You)"
          >
            DA
          </div>
          <div
            className="w-7 h-7 rounded-full bg-(--chart-blue) text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white"
            title="Sarah Jenkins (Product)"
          >
            SJ
          </div>
          <div
            className="w-7 h-7 rounded-full bg-(--chart-orange) text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-white"
            title="Alex Rivera (Design)"
          >
            AR
          </div>
        </div>
      </div>
    </header>
  );
}
