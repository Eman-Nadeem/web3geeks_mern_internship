"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskDTO, TaskStatus, TaskPriority, ProjectMemberDTO } from "@/types";
import { api, ApiError } from "@/lib/api-client";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { TaskComments } from "@/components/tasks/task-comments";
import { Trash2, Save, AlertTriangle } from "lucide-react";

interface EditTaskModalProps {
  task: TaskDTO | null;
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  members: ProjectMemberDTO[];
}

type FormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
};

export function EditTaskModal({
  task,
  isOpen,
  onClose,
  organizationId,
  projectId,
  members,
}: EditTaskModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>();

  useEffect(() => {
    if (task) {
      let formattedDate = "";
      if (task.dueDate) {
        formattedDate = new Date(task.dueDate).toISOString().split("T")[0];
      }
      reset({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId || "",
        dueDate: formattedDate,
      });
      setIsConfirmingDelete(false);
      setServerError(null);
    }
  }, [task, reset]);

  const updateMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!task) return;
      const payload: Record<string, any> = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId && data.assigneeId.trim() !== "" ? data.assigneeId : null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };

      const res = await api.patch<{ task: TaskDTO }>(
        `/organizations/${organizationId}/projects/${projectId}/tasks/${task.id}`,
        payload
      );
      return res.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] });
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to update task");
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!task) return;
      return api.delete(
        `/organizations/${organizationId}/projects/${projectId}/tasks/${task.id}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] });
      setIsConfirmingDelete(false);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to delete task");
      }
    },
  });

  if (!task) return null;

  const onSubmit = (data: FormValues) => {
    setServerError(null);
    updateMutation.mutate(data);
  };

  const isFormerMember = task.assigneeId && !task.isAssigneeActive;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details & Edit"
      description={`Task ID: ${task.id.slice(0, 8)}... • Created ${new Date(task.createdAt).toLocaleDateString()}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        {isFormerMember && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Former Member Assigned:</span> The current assignee (
              {task.assignee?.name || "User"}) has been removed from this project. Their past assignment
              remains preserved, but you can reassign this task to an active project member.
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Title *
          </label>
          <Input
            placeholder="Task title"
            {...register("title", { required: "Title is required", minLength: 2 })}
            error={errors.title?.message}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none shadow-sm dark:shadow-none"
            placeholder="Description and specifications..."
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Status
            </label>
            <select
              {...register("status")}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm dark:shadow-none"
            >
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.REVIEW}>Review</option>
              <option value={TaskStatus.COMPLETED}>Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Priority
            </label>
            <select
              {...register("priority")}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm dark:shadow-none"
            >
              <option value={TaskPriority.LOW}>Low</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Assignee
            </label>
            <select
              {...register("assigneeId")}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm dark:shadow-none"
            >
              <option value="">Unassigned</option>
              {isFormerMember && task.assignee && (
                <option value={task.assignee.id}>
                  {task.assignee.name} (Former Member - Inactive)
                </option>
              )}
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.user.email}) {m.role === "owner" ? "★ Owner" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              {...register("dueDate")}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm dark:shadow-none"
            />
          </div>
        </div>

        {/* Delete Confirmation or Buttons */}
        {isConfirmingDelete ? (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 space-y-3 mt-4">
            <div className="text-xs text-red-700 dark:text-red-300">
              Are you sure you want to delete this task? This action cannot be undone.
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/80">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsConfirmingDelete(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Delete</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-1.5" />
                <span>{updateMutation.isPending ? "Saving..." : "Save Changes"}</span>
              </Button>
            </div>
          </div>
        )}
      </form>

      {task?.id && (
        <div className="mt-4">
          <TaskComments
            taskId={task.id}
            projectId={projectId}
            organizationId={organizationId}
          />
        </div>
      )}
    </Dialog>
  );
}
