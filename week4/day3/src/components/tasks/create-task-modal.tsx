"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TaskStatus, TaskPriority, ProjectMemberDTO } from "@/types";
import { api, ApiError } from "@/lib/api-client";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PlusCircle } from "lucide-react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  members: ProjectMemberDTO[];
}

type FormValues = {
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
};

export function CreateTaskModal({
  isOpen,
  onClose,
  organizationId,
  projectId,
  members,
}: CreateTaskModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      title: "",
      description: "",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: "",
      dueDate: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const payload: Record<string, any> = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        status: data.status,
        priority: data.priority,
        assigneeId: data.assigneeId && data.assigneeId.trim() !== "" ? data.assigneeId : null,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };

      const res = await api.post<{ task: any }>(
        `/organizations/${organizationId}/projects/${projectId}/tasks`,
        payload
      );
      return res.task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
      reset();
      setServerError(null);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to create task");
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset();
    setServerError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Task"
      description="Add an actionable work item to this project and assign it to a team member."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Task Title *
          </label>
          <Input
            placeholder="e.g. Implement OAuth login provider"
            {...register("title", { required: "Title is required", minLength: 2 })}
            error={errors.title?.message}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Technical details, acceptance criteria, or links..."
            {...register("description")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Priority
            </label>
            <select
              {...register("priority")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={TaskPriority.LOW}>Low</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Initial Status
            </label>
            <select
              {...register("status")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={TaskStatus.TODO}>To Do</option>
              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
              <option value={TaskStatus.REVIEW}>Review</option>
              <option value={TaskStatus.COMPLETED}>Completed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Assignee (Project Members)
            </label>
            <select
              {...register("assigneeId")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.user.email}) {m.role === "owner" ? "★ Owner" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Due Date
            </label>
            <input
              type="date"
              {...register("dueDate")}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            <PlusCircle className="w-4 h-4 mr-2" />
            <span>{mutation.isPending ? "Creating..." : "Create Task"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
