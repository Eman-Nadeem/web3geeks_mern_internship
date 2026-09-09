"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  REALTIME_EVENTS,
  DocumentUpdatePayload,
  Collaborator,
  UserJoinedPayload,
  UserLeftPayload,
} from "./events";
import { useAuth } from "@/lib/auth/context";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

interface UseDocumentSocketOptions {
  documentId: string;
  token?: string;
  onRemoteUpdate: (payload: DocumentUpdatePayload) => void;
  onActiveUsersChange?: (users: Collaborator[]) => void;
  onUserJoined?: (user: Collaborator) => void;
  onUserLeft?: (user: Collaborator) => void;
}

export function useDocumentSocket({
  documentId,
  token: initialToken,
  onRemoteUpdate,
  onActiveUsersChange,
  onUserJoined,
  onUserLeft,
}: UseDocumentSocketOptions) {
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [activeUsers, setActiveUsers] = useState<Collaborator[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep latest callbacks in refs to avoid recreating socket listeners
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onActiveUsersChangeRef = useRef(onActiveUsersChange);
  const onUserJoinedRef = useRef(onUserJoined);
  const onUserLeftRef = useRef(onUserLeft);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
    onActiveUsersChangeRef.current = onActiveUsersChange;
    onUserJoinedRef.current = onUserJoined;
    onUserLeftRef.current = onUserLeft;
  });

  useEffect(() => {
    if (!documentId || !user) return;

    let isCancelled = false;

    async function initSocket() {
      let authToken = initialToken;
      if (!authToken) {
        try {
          const res = await fetch("/api/auth/token");
          if (res.ok) {
            const data = await res.json();
            authToken = data.token;
          }
        } catch (e) {
          console.warn("[Socket] Failed to fetch auth token:", e);
        }
      }

      if (isCancelled) return;

      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3001`
          : "http://localhost:3001");

      const socket = io(socketUrl, {
        auth: { token: authToken },
        withCredentials: true,
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socketRef.current = socket;
      setConnectionState("connecting");

    socket.on("connect", () => {
      setConnectionState("connected");
      // Join document room
      socket.emit(
        REALTIME_EVENTS.JOIN_DOCUMENT,
        { documentId },
        (res: { success: boolean; activeUsers?: Collaborator[] }) => {
          if (res?.success && res.activeUsers) {
            setActiveUsers(res.activeUsers);
            onActiveUsersChangeRef.current?.(res.activeUsers);
          }
        }
      );
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
      setConnectionState("disconnected");
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected:", reason);
      setConnectionState(reason === "io client disconnect" ? "disconnected" : "reconnecting");
    });

    socket.io.on("reconnect_attempt", () => {
      setConnectionState("reconnecting");
    });

    socket.io.on("reconnect", () => {
      setConnectionState("connected");
      // Re-join document room after reconnection
      socket.emit(REALTIME_EVENTS.JOIN_DOCUMENT, { documentId });
    });

    // Room active collaborators list
    socket.on(
      REALTIME_EVENTS.ROOM_USERS,
      (data: { documentId: string; users: Collaborator[] }) => {
        if (data.documentId === documentId) {
          setActiveUsers(data.users);
          onActiveUsersChangeRef.current?.(data.users);
        }
      }
    );

    // Remote collaborator joined
    socket.on(REALTIME_EVENTS.USER_JOINED, (data: UserJoinedPayload) => {
      if (data.documentId === documentId) {
        setActiveUsers((prev) => {
          const exists = prev.some((u) => u.id === data.user.id);
          const next = exists ? prev : [...prev, data.user];
          onActiveUsersChangeRef.current?.(next);
          return next;
        });
        onUserJoinedRef.current?.(data.user);
      }
    });

    // Remote collaborator left
    socket.on(REALTIME_EVENTS.USER_LEFT, (data: UserLeftPayload) => {
      if (data.documentId === documentId) {
        setActiveUsers((prev) => {
          const next = prev.filter((u) => u.id !== data.user.id);
          onActiveUsersChangeRef.current?.(next);
          return next;
        });
        onUserLeftRef.current?.(data.user);
      }
    });

    // Incoming real-time document broadcast from peer
    socket.on(REALTIME_EVENTS.DOCUMENT_UPDATE, (data: DocumentUpdatePayload) => {
      if (data.documentId === documentId) {
        onRemoteUpdateRef.current(data);
      }
    });
  }

  void initSocket();

  return () => {
    isCancelled = true;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (socketRef.current) {
      socketRef.current.emit(REALTIME_EVENTS.LEAVE_DOCUMENT, { documentId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  };
}, [documentId, user, initialToken]);

  /**
   * Broadcasts document content, title, status, or category change debounced (250ms).
   */
  const sendChange = useCallback(
    (change: {
      content?: string;
      title?: string;
      jsonContent?: string;
      status?: string;
      category?: string;
    }) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        const socket = socketRef.current;
        if (socket && socket.connected) {
          socket.emit(REALTIME_EVENTS.DOCUMENT_CHANGE, {
            documentId,
            ...change,
            updatedAt: new Date().toISOString(),
          });
        } else {
          // Note (Issue 4 - Documented Exception): Offline edits are not rebroadcast on reconnect in Day 2 scope.
          // Changes made while disconnected still persist via HTTP autosave; peer sync replay and advanced
          // conflict resolution are tracked as future milestones.
        }
      }, 250);
    },
    [documentId]
  );

  return {
    connectionState,
    activeUsers,
    sendChange,
  };
}
