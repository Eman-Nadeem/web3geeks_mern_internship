"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import { MemberItemDTO, ProjectMemberDTO } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { UserPlus, Search, UserCheck } from "lucide-react";

interface AddProjectMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  currentMembers: ProjectMemberDTO[];
}

export function AddProjectMemberModal({
  isOpen,
  onClose,
  organizationId,
  projectId,
  currentMembers,
}: AddProjectMemberModalProps) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch all organization members
  const { data: orgMembers, isLoading } = useQuery({
    queryKey: ["org-members", organizationId],
    queryFn: async () => {
      const res = await api.get<{ members: MemberItemDTO[] }>(
        `/organizations/${organizationId}/members`
      );
      return res.members;
    },
    enabled: isOpen,
  });

  const existingUserIds = new Set(currentMembers.map((m) => m.userId));
  const availableMembers = (orgMembers || []).filter(
    (m) =>
      !existingUserIds.has(m.userId) &&
      (m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        m.email.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  const mutation = useMutation({
    mutationFn: async (userId: string) => {
      return api.post(`/organizations/${organizationId}/projects/${projectId}/members`, {
        userId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", organizationId] });
      setSelectedUserId("");
      setSearchFilter("");
      setServerError(null);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Failed to add project member");
      }
    },
  });

  const handleAdd = () => {
    if (!selectedUserId) return;
    setServerError(null);
    mutation.mutate(selectedUserId);
  };

  const handleClose = () => {
    setSelectedUserId("");
    setSearchFilter("");
    setServerError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Project Member"
      description="Select an organization collaborator to grant them access and task assignments in this project."
    >
      <div className="space-y-4 mt-2">
        {serverError && <Alert variant="error">{serverError}</Alert>}

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search workspace members..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-sm dark:shadow-none"
          />
        </div>

        {/* Member Select List */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2 bg-slate-50/50 dark:bg-slate-950/50">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-500">Loading members...</div>
          ) : availableMembers.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
              {orgMembers && orgMembers.length > 0
                ? "All organization members are already in this project."
                : "No available members found."}
            </div>
          ) : (
            availableMembers.map((member) => {
              const isSelected = selectedUserId === member.userId;
              return (
                <div
                  key={member.id}
                  onClick={() => setSelectedUserId(member.userId)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-blue-600/10 dark:bg-blue-600/20 border border-blue-500/40 text-blue-900 dark:text-white"
                      : "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={member.name} avatarUrl={member.avatar} size="sm" />
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{member.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{member.email}</div>
                    </div>
                  </div>
                  {isSelected && <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedUserId || mutation.isPending}
            onClick={handleAdd}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            <span>{mutation.isPending ? "Adding..." : "Add to Project"}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
