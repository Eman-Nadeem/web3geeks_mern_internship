"use client";

import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";
import { usePusherChannel } from "@/hooks/use-pusher-channel";
import type { CommentDTO, Role } from "@/types";

interface TaskCommentsProps {
  taskId: string;
  projectId: string;
  organizationId: string;
  currentUserRole?: Role;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

export function TaskComments({
  taskId,
  projectId,
  organizationId,
  currentUserRole,
}: TaskCommentsProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [newCommentBody, setNewCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const queryKey = ["comments", taskId];

  // 1. Fetch comments
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.get<{ comments: CommentDTO[]; nextCursor: string | null }>(
        `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`
      );
      return res.comments;
    },
    enabled: !!taskId && !!projectId && !!organizationId,
  });

  const comments = data || [];

  // 2. Real-time Pusher channel listener for this project
  usePusherChannel(
    projectId ? `project-${projectId}` : null,
    "task:comment.created",
    (payload: { taskId: string; comment: CommentDTO }) => {
      if (payload.taskId === taskId) {
        queryClient.setQueryData<CommentDTO[]>(queryKey, (old = []) => {
          if (old.some((c) => c.id === payload.comment.id)) return old;
          return [...old, payload.comment];
        });
      }
    }
  );

  usePusherChannel(
    projectId ? `project-${projectId}` : null,
    "task:comment.deleted",
    (payload: { taskId: string; commentId: string }) => {
      if (payload.taskId === taskId) {
        queryClient.setQueryData<CommentDTO[]>(queryKey, (old = []) =>
          old.filter((c) => c.id !== payload.commentId)
        );
      }
    }
  );

  // 3. Create comment mutation
  const createMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post<{ comment: CommentDTO }>(
        `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments`,
        { body }
      );
      return res.comment;
    },
    onSuccess: (newComment) => {
      setNewCommentBody("");
      queryClient.setQueryData<CommentDTO[]>(queryKey, (old = []) => {
        if (old.some((c) => c.id === newComment.id)) return old;
        return [...old, newComment];
      });
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    },
  });

  // 4. Update comment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ commentId, body }: { commentId: string; body: string }) => {
      const res = await api.patch<{ comment: CommentDTO }>(
        `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        { body }
      );
      return res.comment;
    },
    onSuccess: (updated) => {
      setEditingCommentId(null);
      setEditingBody("");
      queryClient.setQueryData<CommentDTO[]>(queryKey, (old = []) =>
        old.map((c) => (c.id === updated.id ? updated : c))
      );
    },
  });

  // 5. Delete comment mutation
  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await api.delete(
        `/organizations/${organizationId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`
      );
      return commentId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<CommentDTO[]>(queryKey, (old = []) =>
        old.filter((c) => c.id !== deletedId)
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentBody.trim() || createMutation.isPending) return;
    createMutation.mutate(newCommentBody.trim());
  };

  const handleStartEdit = (comment: CommentDTO) => {
    setEditingCommentId(comment.id);
    setEditingBody(comment.body);
  };

  const handleSaveEdit = (commentId: string) => {
    if (!editingBody.trim() || updateMutation.isPending) return;
    updateMutation.mutate({ commentId, body: editingBody.trim() });
  };

  return (
    <div className="flex flex-col space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
          <MessageSquare className="w-4 h-4 text-blue-500" />
          <span>Comments</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            {comments.length}
          </span>
        </div>
      </div>

      {/* Comment List */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="ml-2 text-xs">Loading comments...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
            No comments yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => {
            const isAuthor = user?.id === comment.author.id;
            const canDelete =
              isAuthor || currentUserRole === "OWNER" || currentUserRole === "ADMIN";
            const isEditing = editingCommentId === comment.id;

            return (
              <div
                key={comment.id}
                className="group p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs transition-colors"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-[10px]">
                      {comment.author.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {comment.author.name}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                    {comment.editedAt && (
                      <span className="text-[10px] text-slate-400 italic">(edited)</span>
                    )}
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isAuthor && (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(comment)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                          title="Edit comment"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(comment.id)}
                          disabled={deleteMutation.isPending}
                          className="p-1 rounded text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Body or Edit Input */}
                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs resize-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingCommentId(null)}
                        className="px-2 py-1 rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(comment.id)}
                        disabled={updateMutation.isPending || !editingBody.trim()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] disabled:opacity-50"
                      >
                        {updateMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
                        <span>Save</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {comment.body}
                  </p>
                )}
              </div>
            );
          })
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* New Comment Input */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
        <input
          type="text"
          value={newCommentBody}
          onChange={(e) => setNewCommentBody(e.target.value)}
          placeholder="Write a comment..."
          disabled={createMutation.isPending}
          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newCommentBody.trim()}
          className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          title="Send comment"
        >
          {createMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
