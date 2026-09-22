"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, ApiError } from "@/lib/api-client";
import { OrganizationDTO, OrganizationDetailDTO, UserRole } from "@/types";
import { updateOrgSchema, UpdateOrgInput } from "@/lib/validations";
import { canEditOrgDetails, canEditSlug } from "@/server/modules/memberships/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteOrgModal } from "@/components/organizations/delete-org-modal";
import {
  Building2,
  Settings,
  Upload,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  LayoutDashboard,
  Users,
} from "lucide-react";

export default function OrgSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSlugConfirmOpen, setIsSlugConfirmOpen] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<UpdateOrgInput | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // 1. Fetch user's allowed organizations list
  const { data: userOrgs, isLoading: isOrgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ organizations: OrganizationDTO[] }>("/organizations");
      return res.organizations;
    },
  });

  const matchingOrg = (userOrgs || []).find((org) => org.slug === orgSlug);

  // 2. Fetch org details
  const {
    data: orgDetail,
    isLoading: isDetailLoading,
  } = useQuery({
    queryKey: ["organization", matchingOrg?.id],
    queryFn: async () => {
      if (!matchingOrg) throw new Error("No access to organization");
      const res = await api.get<{ organization: OrganizationDetailDTO }>(
        `/organizations/${matchingOrg.id}`
      );
      return res.organization;
    },
    enabled: !!matchingOrg?.id,
  });

  const role = (orgDetail?.currentUserRole || matchingOrg?.role || "MEMBER") as UserRole;
  const isOwner = role === "OWNER";
  const canEdit = canEditOrgDetails(role);
  const canChangeSlug = canEditSlug(role);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateOrgInput>({
    resolver: zodResolver(updateOrgSchema),
    defaultValues: {
      name: "",
      description: "",
      logoUrl: "",
      slug: "",
    },
  });

  const descriptionValue = watch("description") || "";
  const logoUrlValue = watch("logoUrl") || "";

  useEffect(() => {
    if (orgDetail) {
      reset({
        name: orgDetail.name || "",
        description: orgDetail.description || "",
        logoUrl: orgDetail.logoUrl || "",
        slug: orgDetail.slug || "",
      });
    }
  }, [orgDetail, reset]);

  // Update org mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateOrgInput) => {
      if (!matchingOrg) throw new Error("Organization not found");
      return await api.patch<{ organization: { id: string; name: string; slug: string } }>(
        `/organizations/${matchingOrg.id}`,
        data
      );
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      queryClient.invalidateQueries({ queryKey: ["organization", matchingOrg?.id] });
      setSuccessMessage("Organization settings updated successfully");
      setServerError(null);

      // If slug changed, navigate to new URL
      if (variables.slug && variables.slug !== orgSlug) {
        router.push(`/dashboard/${variables.slug}/settings`);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to update organization settings");
      }
      setSuccessMessage(null);
    },
  });

  const onSubmit = (data: UpdateOrgInput) => {
    setServerError(null);
    setSuccessMessage(null);

    // If slug is changed, show confirmation warning modal
    if (isOwner && data.slug && data.slug !== orgSlug) {
      setPendingFormData(data);
      setIsSlugConfirmOpen(true);
      return;
    }

    updateMutation.mutate(data);
  };

  const confirmSlugChange = () => {
    if (pendingFormData) {
      updateMutation.mutate(pendingFormData);
      setIsSlugConfirmOpen(false);
      setPendingFormData(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !matchingOrg) return;

    if (file.size > 2 * 1024 * 1024) {
      setServerError("File size exceeds 2MB limit");
      return;
    }

    setUploadingLogo(true);
    setServerError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/organizations/${matchingOrg.id}/logo`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to upload logo");
      }

      setValue("logoUrl", data.data.url, { shouldDirty: true });
    } catch (err: any) {
      setServerError(err.message || "Failed to upload logo image");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (isOrgsLoading || isDetailLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!matchingOrg) {
    return (
      <div className="text-center py-20">
        <Alert variant="error">Organization not found or access denied.</Alert>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/${orgSlug}`}>
            <Button variant="ghost" size="sm" className="h-9 px-2.5">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-blue-400" />
              <span>Organization Settings</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage workspace configuration, branding, and permissions for {orgDetail?.name || matchingOrg.name}
            </p>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          <Link href={`/dashboard/${orgSlug}`}>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          </Link>
          <Link href={`/dashboard/${orgSlug}/members`}>
            <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Members</span>
            </button>
          </Link>
          <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {serverError && <Alert variant="error">{serverError}</Alert>}
      {successMessage && (
        <Alert variant="success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        </Alert>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* General Details Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-base font-semibold text-white">General Information</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Update organization identity, description, and workspace appearance
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {/* Name Input */}
            <Input
              label="Organization Name"
              type="text"
              placeholder="Acme Corp"
              disabled={!canEdit}
              error={errors.name?.message}
              {...register("name")}
            />

            {/* Description Textarea with Character Counter */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  Description
                </label>
                <span
                  className={`text-[11px] ${
                    descriptionValue.length > 500 ? "text-red-400 font-semibold" : "text-slate-500"
                  }`}
                >
                  {descriptionValue.length} / 500 characters
                </span>
              </div>
              <textarea
                rows={3}
                disabled={!canEdit}
                placeholder="Briefly describe what your organization does..."
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all disabled:opacity-60 disabled:cursor-not-allowed resize-y"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-xs text-red-400">{errors.description.message}</p>
              )}
            </div>

            {/* Logo Upload & Preview */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Organization Logo
              </label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-800/80 bg-slate-950/40">
                <div className="w-16 h-16 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrlValue ? (
                    <img
                      src={logoUrlValue}
                      alt="Logo Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="w-8 h-8 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={handleFileUpload}
                        disabled={!canEdit || uploadingLogo}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!canEdit || uploadingLogo}
                        className="pointer-events-none"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        <span>{uploadingLogo ? "Uploading..." : "Upload Logo"}</span>
                      </Button>
                    </label>

                    {logoUrlValue && canEdit && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setValue("logoUrl", "", { shouldDirty: true })}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>Remove</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    PNG, JPEG, WebP or GIF. Maximum file size 2MB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Slug (Owner Only) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-white">Workspace URL Slug</h2>
                {!canChangeSlug && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Lock className="w-3 h-3" />
                    <span>Owner Only</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                The unique identifier used in your organization dashboard URLs
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xs text-slate-500 font-mono">
                /dashboard/
              </span>
              <input
                type="text"
                disabled={!canChangeSlug}
                placeholder="acme-corp"
                className="w-full pl-28 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-sm font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                {...register("slug")}
              />
            </div>
            {errors.slug && (
              <p className="text-xs text-red-400">{errors.slug.message}</p>
            )}
            {!canChangeSlug ? (
              <p className="text-[11px] text-slate-500">
                Only the organization owner can modify the workspace URL slug.
              </p>
            ) : (
              <p className="text-[11px] text-amber-400/80">
                Warning: Changing this slug will immediately break existing bookmarked URLs for all members.
              </p>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        {canEdit && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting || updateMutation.isPending}
            >
              <span>Save Changes</span>
            </Button>
          </div>
        )}
      </form>

      {/* Danger Zone (Owner Only) */}
      {isOwner && (
        <div className="rounded-2xl border border-red-500/20 bg-red-950/10 backdrop-blur-xl p-6 shadow-xl space-y-4">
          <div className="border-b border-red-500/20 pb-3">
            <h2 className="text-base font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span>Danger Zone</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Destructive actions for this organization
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">Delete this organization</p>
              <p className="text-xs text-slate-400">
                Permanently delete this organization, all memberships, and invitations. This action cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              <span>Delete Organization</span>
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <Dialog isOpen={isSlugConfirmOpen} onClose={() => setIsSlugConfirmOpen(false)}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle>Confirm Workspace Slug Change</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-slate-300">
            Changing the workspace slug to <strong className="font-mono text-white">/{pendingFormData?.slug}</strong> will immediately invalidate all existing URLs and bookmarks for team members.
          </p>
          <p className="text-xs text-slate-400">
            Are you sure you want to proceed with this change?
          </p>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSlugConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={confirmSlugChange}
              isLoading={updateMutation.isPending}
            >
              Confirm & Update Slug
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      <DeleteOrgModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        organizationId={matchingOrg.id}
        organizationName={orgDetail?.name || matchingOrg.name}
      />
    </div>
  );
}
