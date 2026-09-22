"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProjectSchema, CreateProjectInput } from "@/server/modules/projects/schemas";
import { ProjectStatus } from "@/types";
import { api, ApiError } from "@/lib/api-client";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { FolderPlus } from "lucide-react";

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  onSuccess?: (projectId: string) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  organizationId,
  onSuccess,
}: CreateProjectModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      status: ProjectStatus.PLANNING,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateProjectInput) => {
      const res = await api.post<{ project: { id: string } }>(
        `/organizations/${organizationId}/projects`,
        data
      );
      return res.project;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId] });
      reset();
      setServerError(null);
      onClose();
      if (onSuccess) {
        onSuccess(project.id);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to create project");
      }
    },
  });

  const onSubmit = (data: CreateProjectInput) => {
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
      title="Create New Project"
      description="Initialize a project workspace to track milestones, tasks, and team collaboration."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Project Name *
          </label>
          <Input
            placeholder="e.g. Website Redesign, Mobile App v2"
            {...register("name")}
            error={errors.name?.message}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            placeholder="Outline goals, deliverables, and technical requirements..."
            {...register("description")}
          />
          {errors.description?.message && (
            <p className="mt-1 text-xs text-red-400">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Initial Status
          </label>
          <select
            {...register("status")}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value={ProjectStatus.PLANNING}>Planning</option>
            <option value={ProjectStatus.ACTIVE}>Active</option>
            <option value={ProjectStatus.ON_HOLD}>On Hold</option>
            <option value={ProjectStatus.COMPLETED}>Completed</option>
            <option value={ProjectStatus.ARCHIVED}>Archived</option>
          </select>
          {errors.status?.message && (
            <p className="mt-1 text-xs text-red-400">{errors.status.message}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            <FolderPlus className="w-4 h-4 mr-2" />
            <span>{mutation.isPending ? "Creating..." : "Create Project"}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
