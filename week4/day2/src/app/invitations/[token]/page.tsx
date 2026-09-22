"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { PublicInvitationDTO } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import {
  Building2,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  LogOut,
  Layers,
  Sparkles,
} from "lucide-react";

export default function InvitationAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";

  const { user: authUser, isAuthenticated, logout } = useAuth();
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // 1. Fetch invitation details
  const {
    data: invitation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-invitation", token],
    queryFn: async () => {
      const res = await api.get<PublicInvitationDTO>(`/invitations/${token}`);
      return res;
    },
    enabled: !!token,
    retry: false,
  });

  // 2. Accept invitation mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      return await api.post<{ organizationId: string; organizationSlug: string }>(
        `/invitations/${token}/accept`,
        {}
      );
    },
    onSuccess: (data: { organizationId: string; organizationSlug: string }) => {
      router.push(`/dashboard/${data.organizationSlug}`);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setAcceptError(err.message);
      } else {
        setAcceptError("Failed to accept invitation. Please try again.");
      }
    },
  });

  const handleSwitchAccount = async () => {
    await logout();
    if (invitation) {
      router.push(
        `/login?email=${encodeURIComponent(invitation.email)}&redirect=/invitations/${token}`
      );
    }
  };

  // State: Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] px-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-slate-300 font-medium">Verifying invitation details...</p>
        </div>
      </div>
    );
  }

  // State: Error / Not Found / Expired / Already Used
  if (error || !invitation) {
    const apiError = error instanceof ApiError ? error : null;
    const statusCode = apiError?.statusCode;

    let title = "Invitation Not Found";
    let description = "This invitation link is invalid or may have been deleted.";
    let icon = <XCircle className="w-12 h-12 text-red-400" />;

    if (statusCode === 410) {
      title = "Invitation Has Expired";
      description = "This invitation has exceeded its 72-hour validity window. Please request a new invitation from your team admin.";
      icon = <Clock className="w-12 h-12 text-amber-400" />;
    } else if (statusCode === 409) {
      title = "Invitation Already Used or Cancelled";
      description = "This invitation has already been accepted or was cancelled by the organization admin.";
      icon = <AlertTriangle className="w-12 h-12 text-amber-400" />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f17] px-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl shadow-2xl text-center space-y-6">
          <div className="p-4 rounded-2xl bg-slate-800/40 w-fit mx-auto border border-slate-700/50">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          </div>
          <Link href="/login" className="block">
            <Button variant="primary" className="w-full">
              <span>Go to Sign In</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isEmailMatching =
    isAuthenticated &&
    authUser?.email?.toLowerCase() === invitation.email.toLowerCase();

  const isEmailMismatched =
    isAuthenticated &&
    authUser?.email?.toLowerCase() !== invitation.email.toLowerCase();

  const loginUrl = `/login?email=${encodeURIComponent(invitation.email)}&redirect=/invitations/${token}`;
  const registerUrl = `/register?email=${encodeURIComponent(invitation.email)}&redirect=/invitations/${token}`;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[#0b0f17]">
      <div className="w-full max-w-lg space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 mb-1">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Team Workspace Invitation
          </h1>
          <p className="text-sm text-slate-400">
            You have been invited to collaborate on Team Collab SaaS
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl space-y-6">
          {acceptError && <Alert variant="error">{acceptError}</Alert>}

          {/* Org & Inviter Details Banner */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center overflow-hidden shrink-0">
              {invitation.organization.logoUrl ? (
                <img
                  src={invitation.organization.logoUrl}
                  alt={invitation.organization.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  {invitation.organization.name}
                </h2>
                <Badge role={invitation.role} />
              </div>
              <p className="text-xs text-slate-400">
                Invited by <strong className="text-slate-300">{invitation.invitedBy.name}</strong> ({invitation.invitedBy.email})
              </p>
            </div>
          </div>

          {/* Recipient Details */}
          <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/40 text-xs text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span>Invited Email:</span>
              <span className="font-semibold text-slate-200">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expires On:</span>
              <span className="text-slate-300">{formatDate(invitation.expiresAt)}</span>
            </div>
          </div>

          {/* Conditional Action States */}

          {/* STATE 1: Unauthenticated */}
          {!isAuthenticated && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-blue-400" />
                <span>Sign in or create an account with <strong>{invitation.email}</strong> to accept this invitation.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href={loginUrl}>
                  <Button variant="primary" size="lg" className="w-full">
                    <span>Log in to Accept</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href={registerUrl}>
                  <Button variant="secondary" size="lg" className="w-full">
                    <span>Create Account</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* STATE 2: Authenticated with MATCHING email */}
          {isEmailMatching && (
            <div className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>You are signed in as <strong>{authUser.email}</strong>. Ready to join!</span>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full shadow-lg shadow-blue-500/20"
                onClick={() => acceptMutation.mutate()}
                isLoading={acceptMutation.isPending}
              >
                <UserCheck className="w-5 h-5 mr-2" />
                <span>Accept Invitation & Join Team</span>
              </Button>
            </div>
          )}

          {/* STATE 3: Authenticated with DIFFERENT email */}
          {isEmailMismatched && (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-amber-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Account Email Mismatch</span>
                </div>
                <p>
                  You are currently signed in as <strong className="text-white">{authUser?.email}</strong>, but this invitation was sent specifically to <strong className="text-white">{invitation.email}</strong>.
                </p>
              </div>

              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={handleSwitchAccount}
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span>Log out & Switch to {invitation.email}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
