"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { usePusherChannel } from "./use-pusher-channel";
import { api } from "@/lib/api-client";
import type { NotificationDTO } from "@/types";
import { useAuth } from "@/providers/auth-provider";

interface NotificationsResponse {
  notifications: NotificationDTO[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function useNotifications(page = 1, unreadOnly = false) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const queryKey = ["notifications", { page, unreadOnly }];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        unreadOnly: String(unreadOnly),
      });
      const res = await api.get<NotificationsResponse & { unreadCount: number }>(`/notifications?${params}`);
      return res;
    },
    staleTime: 30_000,
  });

  // Live update: when a new notification arrives via Pusher, invalidate + refetch
  const handleNewNotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  usePusherChannel(
    user?.id ? `private-user-${user.id}` : null,
    "user:notification",
    handleNewNotification
  );

  const markRead = useCallback(
    async (id: string) => {
      await api.patch(`/notifications/${id}`, { isRead: true });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    [queryClient]
  );

  const markAllRead = useCallback(async () => {
    await api.post("/notifications/read-all");
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  return {
    ...query,
    notifications: query.data?.notifications ?? [],
    unreadCount: query.data?.unreadCount ?? 0,
    markRead,
    markAllRead,
  };
}
