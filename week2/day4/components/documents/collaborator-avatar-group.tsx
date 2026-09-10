"use client";

import { useState } from "react";

export interface CollaboratorInfo {
  id?: string;
  name: string;
  initials: string;
  avatarUrl?: string | null;
  isOwner?: boolean;
  email?: string;
}

interface CollaboratorAvatarGroupProps {
  collaborators: CollaboratorInfo[];
  maxDisplay?: number;
  size?: "sm" | "md";
}

const BG_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-purple-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
  "bg-teal-600",
];

function getBgColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BG_COLORS.length;
  return BG_COLORS[index];
}

function SingleAvatar({
  collaborator,
  sizeClass,
  textSize,
}: {
  collaborator: CollaboratorInfo;
  sizeClass: string;
  textSize: string;
}) {
  const [imageError, setImageError] = useState(false);
  const bgColor = getBgColor(collaborator.name || "User");

  return (
    <div
      className={`${sizeClass} rounded-full border-2 border-white ${bgColor} text-white ${textSize} font-bold flex items-center justify-center overflow-hidden shadow-xs shrink-0 transition-transform hover:scale-110 hover:z-20 cursor-default`}
      title={`${collaborator.name}${collaborator.isOwner ? " (Owner)" : ""}`}
    >
      {collaborator.avatarUrl && !imageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={collaborator.avatarUrl}
          alt={collaborator.name}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{collaborator.initials || "U"}</span>
      )}
    </div>
  );
}

export function CollaboratorAvatarGroup({
  collaborators,
  maxDisplay = 3,
  size = "md",
}: CollaboratorAvatarGroupProps) {
  if (!collaborators || collaborators.length === 0) {
    return null;
  }

  const visibleCollaborators = collaborators.slice(0, maxDisplay);
  const overflowCount = collaborators.length - maxDisplay;
  const overflowNames = overflowCount > 0
    ? collaborators.slice(maxDisplay).map((c) => c.name).join(", ")
    : "";

  const sizeClass = size === "sm" ? "w-5.5 h-5.5" : "w-6.5 h-6.5";
  const textSize = size === "sm" ? "text-[9px]" : "text-[10px]";

  return (
    <div className="flex items-center -space-x-1.5 overflow-hidden py-0.5">
      {visibleCollaborators.map((col, idx) => (
        <SingleAvatar
          key={col.id || `${col.name}-${idx}`}
          collaborator={col}
          sizeClass={sizeClass}
          textSize={textSize}
        />
      ))}

      {overflowCount > 0 && (
        <div
          className={`${sizeClass} rounded-full border-2 border-white bg-slate-200 text-slate-700 ${textSize} font-bold flex items-center justify-center shadow-xs shrink-0 cursor-default transition-transform hover:scale-110 hover:z-20`}
          title={`+${overflowCount} more: ${overflowNames}`}
        >
          +{overflowCount}
        </div>
      )}
    </div>
  );
}
