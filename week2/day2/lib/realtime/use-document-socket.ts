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
  onRemoteUpdate: (payload: DocumentUpdatePayload) => void;
  onActiveUsersChange?: (users: Collaborator[]) => void;
  onUserJoined?: (user: Collaborator) => void;
  onUserLeft?: (user: Collaborator) => void;
}

export function useDocumentSocket({
  documentId,
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
  onRemoteUpdateRef.current = onRemoteUpdate;

  const onActiveUsersChangeRef = useRef(onActiveUsersChange);
  onActiveUsersChangeRef.current = onActiveUsersChange;

  const onUserJoinedRef = useRef(onUserJoined);
  onUserJoinedRef.current = onUserJoined;

  const onUserLeftRef = useRef(onUserLeft);
  onUserLeftRef.current = onUserLeft;

  useEffect(() => {
    if (!documentId || !user) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined" && window.location.hostname === "localhost"
        ? "http://localhost:3001"
        : "");

    const socket = io(socketUrl, {
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

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      socket.emit(REALTIME_EVENTS.LEAVE_DOCUMENT, { documentId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [documentId, user]);

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
