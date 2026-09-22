"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { UserRole, InvitationDTO } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { canRemoveMember, canManageInvitations } from "@/server/modules/memberships/permissions";
import { MemberListItem } from "@/server/modules/memberships/service";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils";
import { InviteMemberModal } from "./invite-member-modal";
import { RemoveMemberModal } from "./remove-member-modal";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  UserMinus,
  Mail,
  RefreshCw,
  XCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface MemberManagementProps {
  organizationId: string;
  actorRole: UserRole;
}

export function MemberManagement({ organizationId, actorRole }: MemberManagementProps) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modals state
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);

  // Status message / notifications
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const canManage = canManageInvitations(actorRole);

  // 1. Fetch Members query with search and filter
  const {
    data: membersData,
    isLoading: isMembersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["org", organizationId, "members", searchTerm, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);

      const res = await api.get<{ members: MemberListItem[] }>(
        `/organizations/${organizationId}/members?${params.toString()}`
      );
      return res.members;
    },
    enabled: !!organizationId,
  });

  // 2. Fetch Invitations query (only if OWNER/ADMIN)
  const {
    data: invitationsData,
    isLoading: isInvitationsLoading,
    error: invitationsError,
  } = useQuery({
    queryKey: ["org", organizationId, "invitations"],
    queryFn: async () => {
      const res = await api.get<{ invitations: InvitationDTO[] }>(
        `/organizations/${organizationId}/invitations`
      );
      return res.invitations;
    },
    enabled: !!organizationId && canManage,
  });

  const members = useMemo(() => membersData || [], [membersData]);
  const invitations = useMemo(() => invitationsData || [], [invitationsData]);

  // Resend invitation mutation
  const resendMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await api.post<{ invitationLink: string }>(
        `/organizations/${organizationId}/invitations/${invitationId}/resend`,
        {}
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["org", organizationId, "invitations"] });
      setActionMessage({
        type: "success",
        text: `Invitation resent successfully! (Link: ${data.invitationLink})`,
      });
    },
    onError: (err) => {
      setActionMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Failed to resend invitation",
      });
    },
  });

  // Cancel invitation mutation
  const cancelMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      return await api.delete(`/organizations/${organizationId}/invitations/${invitationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org", organizationId, "invitations"] });
      setActionMessage({
        type: "success",
        text: "Invitation cancelled successfully",
      });
    },
    onError: (err) => {
      setActionMessage({
        type: "error",
        text: err instanceof ApiError ? err.message : "Failed to cancel invitation",
      });
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["org", organizationId, "members"] });
    if (canManage) {
      queryClient.invalidateQueries({ queryKey: ["org", organizationId, "invitations"] });
    }
    queryClient.invalidateQueries({ queryKey: ["organization", organizationId] });
  };

  const pendingCount = useMemo(() => {
    return invitations.filter((i) => i.status === "PENDING").length;
  }, [invitations]);

  return (
    <div className="space-y-6">
      {/* Action Notification Alert */}
      {actionMessage && (
        <Alert
          variant={actionMessage.type === "success" ? "success" : "error"}
          className="animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between w-full">
            <span>{actionMessage.text}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs opacity-70 hover:opacity-100 font-bold ml-4"
            >
              ✕
            </button>
          </div>
        </Alert>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("members")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "members"
                ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Members</span>
            <span className="px-1.5 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
              {members.length}
            </span>
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab("invitations")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === "invitations"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Invitations</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs bg-blue-600 text-white font-semibold">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsInviteOpen(true)}
            className="shadow-lg shadow-blue-500/10"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            <span>Invite Member</span>
          </Button>
        )}
      </div>

      {/* Tab Content: MEMBERS */}
      {activeTab === "members" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search members by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all w-full sm:w-auto"
              >
                <option value="ALL">All Roles</option>
                <option value="OWNER">Owners</option>
                <option value="ADMIN">Admins</option>
                <option value="MEMBER">Members</option>
              </select>
            </div>
          </div>

          {/* Members List */}
          {isMembersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1.5">
                      <Skeleton className="w-32 h-4" />
                      <Skeleton className="w-48 h-3.5" />
                    </div>
                  </div>
                  <Skeleton className="w-20 h-6 rounded-full" />
                </div>
              ))}
            </div>
          ) : membersError ? (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-300 text-xs">
              Failed to load organization members.
            </div>
          ) : members.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
              <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No members match your search criteria</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing search filters or inviting team members.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-lg">
              {members.map((member) => {
                const isCurrentActor = currentUser?.id === member.userId;
                const canRemove = canRemoveMember(actorRole, member.role) && !isCurrentActor;

                return (
                  <div
                    key={member.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-800/20 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3.5">
                      <Avatar
                        name={member.name}
                        avatarUrl={member.avatar}
                        size="md"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">{member.name}</p>
                          {isCurrentActor && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <span className="text-xs text-slate-500">
                        Joined {formatDate(member.joinedAt)}
                      </span>
                      <Badge role={member.role} />

                      {canRemove ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setMemberToRemove({
                              id: member.id,
                              name: member.name,
                              email: member.email,
                            })
                          }
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2.5 h-8"
                          title="Remove Member"
                        >
                          <UserMinus className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1 text-xs">Remove</span>
                        </Button>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: INVITATIONS */}
      {activeTab === "invitations" && canManage && (
        <div className="space-y-4">
          {isInvitationsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40"
                >
                  <div className="space-y-1.5">
                    <Skeleton className="w-40 h-4" />
                    <Skeleton className="w-24 h-3.5" />
                  </div>
                  <Skeleton className="w-24 h-6 rounded-full" />
                </div>
              ))}
            </div>
          ) : invitationsError ? (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-300 text-xs">
              Failed to load invitations.
            </div>
          ) : invitations.length === 0 ? (
            <div className="py-12 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20">
              <Mail className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No active or recent invitations</p>
              <p className="text-xs text-slate-500 mt-1">Send an invitation to collaborate with team members.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsInviteOpen(true)}
                className="mt-4"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                <span>Invite First Member</span>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60 rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-lg">
              {invitations.map((inv) => {
                const isPending = inv.status === "PENDING";
                const isExpired = inv.status === "EXPIRED";
                const isAccepted = inv.status === "ACCEPTED";
                const isCancelled = inv.status === "CANCELLED";

                return (
                  <div
                    key={inv.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-800/20 transition-colors gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-white">{inv.email}</span>
                        <Badge role={inv.role} />
                      </div>
                      <p className="text-xs text-slate-400">
                        Invited by {inv.invitedBy?.name || "Team Member"} on {formatDate(inv.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      {/* Status Badge */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          <span>Pending</span>
                        </span>
                      )}
                      {isExpired && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          <AlertCircle className="w-3 h-3" />
                          <span>Expired</span>
                        </span>
                      )}
                      {isAccepted && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Accepted</span>
                        </span>
                      )}
                      {isCancelled && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <XCircle className="w-3 h-3" />
                          <span>Cancelled</span>
                        </span>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {(isPending || isExpired) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resendMutation.mutate(inv.id)}
                            disabled={resendMutation.isPending}
                            className="h-8 px-2.5 text-xs"
                            title="Resend invitation email and extend expiration"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${resendMutation.isPending ? "animate-spin" : ""}`} />
                            <span>Resend</span>
                          </Button>
                        )}

                        {isPending && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate(inv.id)}
                            disabled={cancelMutation.isPending}
                            className="h-8 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Cancel invitation"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Cancel</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        organizationId={organizationId}
        actorRole={actorRole}
        onSuccess={refreshAll}
      />

      <RemoveMemberModal
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
        organizationId={organizationId}
        membershipId={memberToRemove?.id || null}
        memberName={memberToRemove?.name || ""}
        memberEmail={memberToRemove?.email || ""}
        onSuccess={refreshAll}
      />
    </div>
  );
}
