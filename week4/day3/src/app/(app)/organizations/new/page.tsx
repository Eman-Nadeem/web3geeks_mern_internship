"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createOrgSchema, CreateOrgInput } from "@/lib/validations";
import { api, ApiError } from "@/lib/api-client";
import { OrganizationDTO } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Building2, ArrowLeft, Plus } from "lucide-react";

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .substring(0, 48);
}

export default function NewOrganizationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const watchedName = watch("name");

  // Auto-generate slug as user types name (until they manually edit slug)
  useEffect(() => {
    if (!isSlugManuallyEdited && watchedName) {
      const generated = generateSlug(watchedName);
      setValue("slug", generated, { shouldValidate: true });
    }
  }, [watchedName, isSlugManuallyEdited, setValue]);

  const mutation = useMutation({
    mutationFn: async (data: CreateOrgInput) => {
      const res = await api.post<{ organization: OrganizationDTO }>(
        "/organizations",
        data
      );
      return res.organization;
    },
    onSuccess: (newOrg) => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      localStorage.setItem("last_org_slug", newOrg.slug);
      router.push(`/dashboard/${newOrg.slug}`);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to create organization");
      }
    },
  });

  const onSubmit = (data: CreateOrgInput) => {
    setServerError(null);
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Back button */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Dashboard</span>
      </Link>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl space-y-6">
        <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
          <div className="p-3 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Create New Organization
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Set up a shared workspace for your team projects and members.
            </p>
          </div>
        </div>

        {serverError && <Alert variant="error">{serverError}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Organization Name"
            placeholder="e.g. Acme Corporation"
            error={errors.name?.message}
            {...register("name")}
          />

          <div className="space-y-1.5">
            <Input
              label="Organization Slug (URL identifier)"
              placeholder="e.g. acme-corporation"
              helperText="Only lowercase letters, numbers, and hyphens (3-48 characters)"
              error={errors.slug?.message}
              {...register("slug", {
                onChange: () => setIsSlugManuallyEdited(true),
              })}
            />
            <p className="text-[11px] text-slate-500">
              Your organization URL will be:{" "}
              <span className="font-mono text-slate-400">
                https://yourdomain.com/dashboard/{watch("slug") || "your-slug"}
              </span>
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <Link href="/dashboard">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={mutation.isPending || isSubmitting}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Create Organization</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
