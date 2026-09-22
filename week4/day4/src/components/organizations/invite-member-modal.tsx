"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { api, ApiError } from "@/lib/api-client";
import { UserRole } from "@/types";
import { createInvitationSchema, CreateInvitationInput } from "@/server/modules/invitations/schemas";
import { Mail, Check, Copy, UserPlus, Sparkles } from "lucide-react";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  actorRole: UserRole;
  onSuccess: () => void;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  organizationId,
  actorRole,
  onSuccess,
}: InviteMemberModalProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Admin can only invite MEMBER; Owner can invite ADMIN or MEMBER
  const allowedRoles = actorRole === "OWNER" ? ["MEMBER", "ADMIN"] : ["MEMBER"];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      email: "",
      role: "MEMBER",
    },
  });

  const handleClose = () => {
    reset();
    setServerError(null);
    setCreatedInviteLink(null);
    setCopied(false);
    onClose();
  };

  const onSubmit = async (data: CreateInvitationInput) => {
    setServerError(null);
    try {
      const res = await api.post<{ invitationLink: string; email: string }>(
        `/organizations/${organizationId}/invitations`,
        data
      );
      setCreatedInviteLink(res.invitationLink);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to send invitation. Please try again.");
      }
    }
  };

  const copyToClipboard = () => {
    if (createdInviteLink) {
      navigator.clipboard.writeText(createdInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose}>
      <DialogHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <DialogTitle>Invite Team Member</DialogTitle>
        </div>
      </DialogHeader>

      {createdInviteLink ? (
        <div className="space-y-4 py-2">
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300 text-xs flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>Invitation created successfully! An email has been sent.</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Direct Invitation Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdInviteLink}
                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-300 font-mono focus:outline-none"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              You can also copy this link and share it directly with the invitee.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setCreatedInviteLink(null);
                reset();
              }}
            >
              Invite Another
            </Button>
            <Button variant="secondary" size="sm" onClick={handleClose}>
              Done
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {serverError && <Alert variant="error">{serverError}</Alert>}

          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@company.com"
            error={errors.email?.message}
            helperText="The user will receive an invitation link valid for 72 hours"
            {...register("email")}
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Assigned Role
            </label>
            <select
              {...register("role")}
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm dark:shadow-none transition-all"
            >
              {allowedRoles.map((role) => (
                <option key={role} value={role}>
                  {role === "ADMIN" ? "Admin (Manage settings & invite members)" : "Member (Standard access)"}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-xs text-red-600 dark:text-red-400">{errors.role.message}</p>
            )}
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
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
            >
              <Mail className="w-4 h-4 mr-1.5" />
              <span>Send Invitation</span>
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}
