"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface DeleteOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
}

export function DeleteOrgModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
}: DeleteOrgModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      return api.delete(`/organizations/${organizationId}`);
    },
    onSuccess: () => {
      localStorage.removeItem("last_org_slug");
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onClose();
      router.push("/dashboard");
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to delete organization");
      }
    },
  });

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== organizationName) return;
    setServerError(null);
    mutation.mutate();
  };

  const isConfirmed = confirmText === organizationName;

  const handleClose = () => {
    setConfirmText("");
    setServerError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Organization"
      description="This action is permanent and cannot be undone."
    >
      <form onSubmit={handleDelete} className="space-y-4">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <div className="rounded-lg bg-red-950/20 border border-red-900/50 p-3.5 text-xs text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p>
            Deleting <strong>{organizationName}</strong> will immediately revoke access
            for all members and cascade delete all associated data.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Type <span className="text-white font-mono bg-slate-800 px-1.5 py-0.5 rounded">{organizationName}</span> to confirm:
          </label>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={organizationName}
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            disabled={!isConfirmed || mutation.isPending}
            isLoading={mutation.isPending}
          >
            Delete Organization
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
