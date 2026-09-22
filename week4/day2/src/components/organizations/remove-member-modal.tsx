"use client";

import React, { useState } from "react";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api, ApiError } from "@/lib/api-client";
import { UserMinus, AlertTriangle } from "lucide-react";

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  membershipId: string | null;
  memberName: string;
  memberEmail: string;
  onSuccess: () => void;
}

export function RemoveMemberModal({
  isOpen,
  onClose,
  organizationId,
  membershipId,
  memberName,
  memberEmail,
  onSuccess,
}: RemoveMemberModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleClose = () => {
    setServerError(null);
    onClose();
  };

  const handleRemove = async () => {
    if (!membershipId) return;
    setIsSubmitting(true);
    setServerError(null);

    try {
      await api.delete(`/organizations/${organizationId}/members/${membershipId}`);
      onSuccess();
      handleClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to remove member. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogHeader>
        <div className="flex items-center gap-2 text-red-400">
          <div className="p-2 rounded-lg bg-red-600/20">
            <UserMinus className="w-5 h-5" />
          </div>
          <DialogTitle>Remove Team Member</DialogTitle>
        </div>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <p className="text-sm text-slate-300">
          Are you sure you want to remove{" "}
          <strong className="text-white font-semibold">{memberName}</strong> ({memberEmail})
          from the organization?
        </p>

        <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/40 text-red-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
          <span>
            They will immediately lose access to this organization and all associated workspace resources.
          </span>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            isLoading={isSubmitting}
            onClick={handleRemove}
          >
            Remove Member
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
