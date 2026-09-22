"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/providers/auth-provider";

const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute

/**
 * Sends a presence heartbeat every 60 s while the user is authenticated.
 * Stops automatically on unmount (component teardown / sign-out).
 */
export function usePresenceHeartbeat(): void {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const sendHeartbeat = () => {
      api.post("/presence/heartbeat").catch(() => {
        // Silently ignore — network failures don't affect presence correctness
      });
    };

    // Send immediately on mount
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);
}
