"use client";

import { useEffect, useRef } from "react";
import { getPusherClient } from "@/lib/pusher-client";

/**
 * Subscribe to a Pusher channel event.
 * Automatically cleans up on unmount or when channel/event changes.
 * No-ops when Pusher is not configured.
 *
 * @example
 * usePusherChannel(`private-project-${projectId}`, "task:created", (data) => {
 *   queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
 * });
 */
export function usePusherChannel<T = any>(
  channel: string | null | undefined,
  event: string,
  callback: (data: T) => void
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!channel) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const ch = pusher.subscribe(channel);
    const handler = (data: unknown) => callbackRef.current(data as T);
    ch.bind(event, handler);

    return () => {
      ch.unbind(event, handler);
      pusher.unsubscribe(channel);
    };
  }, [channel, event]);
}
