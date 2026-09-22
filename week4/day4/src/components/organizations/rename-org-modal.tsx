"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateOrgSchema, UpdateOrgInput } from "@/lib/validations";
import { api, ApiError } from "@/lib/api-client";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface RenameOrgModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currentName: string;
}

export function RenameOrgModal({
  isOpen,
  onClose,
  organizationId,
  currentName,
}: RenameOrgModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateOrgInput>({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: {
      name: currentName,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateOrgInput) => {
      return api.patch(`/organizations/${organizationId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to rename organization");
      }
    },
  });

  const onSubmit = (data: UpdateOrgInput) => {
    setServerError(null);
    mutation.mutate(data);
  };

  const handleClose = () => {
    reset({ name: currentName });
    setServerError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Rename Organization"
      description="Update the display name of your organization."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        <Input
          label="Organization Name"
          placeholder="e.g. Acme Corp"
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={mutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
