"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import {
  REALTIME_EVENTS,
  DocumentUpdatePayload,
  Collaborator,
  UserJoinedPayload,
  UserLeftPayload,
  PresenceUser,
  PresenceUpdatePayload,
  CursorUpdatePayload,
  SyncResponsePayload,
} from "./events";
import { getUserColor } from "./colors";
import { RemoteCursor } from "@/components/editor/collaboration-cursor";
import { useAuth } from "@/lib/auth/context";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

interface UseDocumentSocketOptions {
  documentId: string;
  token?: string;
  onRemoteUpdate: (payload: DocumentUpdatePayload) => void;
  onActiveUsersChange?: (users: Collaborator[]) => void;
  onPresenceChange?: (users: PresenceUser[]) => void;
  onUserJoined?: (user: Collaborator) => void;
  onUserLeft?: (user: Collaborator) => void;
  onSyncResponse?: (payload: SyncResponsePayload) => void;
}

export function useDocumentSocket({
  documentId,
  token: initialToken,
  onRemoteUpdate,
  onActiveUsersChange,
  onPresenceChange,
  onUserJoined,
  onUserLeft,
  onSyncResponse,
}: UseDocumentSocketOptions) {
  const { user } = useAuth();
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [activeUsers, setActiveUsers] = useState<Collaborator[]>([]);
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<RemoteCursor[]>([]);
  const [documentVersion, setDocumentVersion] = useState<number>(1);

  const socketRef = useRef<Socket | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cursorThrottleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingCursorRef = useRef<{ from: number; to: number } | null | undefined>(undefined);
  const lastCursorSentTimeRef = useRef<number>(0);
  const documentVersionRef = useRef<number>(1);
  const authTokenRef = useRef<string | undefined>(initialToken);
  const hasPendingChangesRef = useRef<boolean>(false);

  // Priority 2: Sync-gate flag and ordered buffer queue
  const isSyncedRef = useRef<boolean>(false);
  const eventBufferRef = useRef<
    (
      | { type: "document_update"; payload: DocumentUpdatePayload }
      | { type: "cursor_update"; payload: CursorUpdatePayload }
    )[]
  >([]);

  // Priority 4: Cursor rAF batching to eliminate transaction stampede
  const pendingRemoteCursorMapRef = useRef<Map<string, RemoteCursor>>(new Map());
  const cursorRafIdRef = useRef<number | null>(null);

  // Keep latest callbacks in refs to avoid recreating socket listeners
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onActiveUsersChangeRef = useRef(onActiveUsersChange);
  const onPresenceChangeRef = useRef(onPresenceChange);
  const onUserJoinedRef = useRef(onUserJoined);
  const onUserLeftRef = useRef(onUserLeft);
  const onSyncResponseRef = useRef(onSyncResponse);

  useEffect(() => {
    onRemoteUpdateRef.current = onRemoteUpdate;
    onActiveUsersChangeRef.current = onActiveUsersChange;
    onPresenceChangeRef.current = onPresenceChange;
    onUserJoinedRef.current = onUserJoined;
    onUserLeftRef.current = onUserLeft;
    onSyncResponseRef.current = onSyncResponse;
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

      authTokenRef.current = authToken;

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

      // Batch helper to flush pending remote cursors via rAF
      const flushPendingRemoteCursors = () => {
        setRemoteCursors(Array.from(pendingRemoteCursorMapRef.current.values()));
        cursorRafIdRef.current = null;
      };

      const scheduleCursorFlush = () => {
        if (typeof window !== "undefined" && !cursorRafIdRef.current) {
          cursorRafIdRef.current = window.requestAnimationFrame(flushPendingRemoteCursors);
        } else if (!cursorRafIdRef.current) {
          flushPendingRemoteCursors();
        }
      };

      const triggerJoinAndSync = () => {
        // Priority 2: Reset sync gate on initial join or reconnect
        isSyncedRef.current = false;
        eventBufferRef.current = [];

        socket.emit(
          REALTIME_EVENTS.JOIN_DOCUMENT,
          { documentId },
          (res: {
            success: boolean;
            activeUsers?: Collaborator[];
            presence?: PresenceUser[];
          }) => {
            if (res?.success) {
              if (res.activeUsers) {
                setActiveUsers(res.activeUsers);
                onActiveUsersChangeRef.current?.(res.activeUsers);
              }
              if (res.presence) {
                setPresenceUsers(res.presence);
                onPresenceChangeRef.current?.(res.presence);
              }
            }
            // Request authoritative document sync upon joining/reconnecting
            socket.emit(REALTIME_EVENTS.SYNC_REQUEST, { documentId });
          }
        );
      };

      socket.on("connect", () => {
        setConnectionState("connected");
        triggerJoinAndSync();
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
        triggerJoinAndSync();
      });

      // Dedicated room users list
      socket.on(
        REALTIME_EVENTS.ROOM_USERS,
        (data: { documentId: string; users: Collaborator[] }) => {
          if (data.documentId === documentId) {
            setActiveUsers(data.users);
            onActiveUsersChangeRef.current?.(data.users);
          }
        }
      );

      // Presence update (deduplicated presence roster with colors)
      socket.on(
        REALTIME_EVENTS.PRESENCE_UPDATE,
        (data: PresenceUpdatePayload) => {
          if (data.documentId === documentId) {
            setPresenceUsers(data.users);
            onPresenceChangeRef.current?.(data.users);

            // Clean up remote cursors of users no longer in room
            const activeUserIds = new Set(data.users.map((u) => u.userId));
            for (const uid of Array.from(pendingRemoteCursorMapRef.current.keys())) {
              if (!activeUserIds.has(uid)) {
                pendingRemoteCursorMapRef.current.delete(uid);
              }
            }
            scheduleCursorFlush();
          }
        }
      );

      // State synchronization response (Priority 2: Sync-gate resolution & buffer draining)
      socket.on(
        REALTIME_EVENTS.SYNC_RESPONSE,
        (data: SyncResponsePayload) => {
          if (data.documentId === documentId) {
            const syncedVersion = data.version ?? 1;
            documentVersionRef.current = syncedVersion;
            setDocumentVersion(syncedVersion);

            if (data.presence) {
              setPresenceUsers(data.presence);
              onPresenceChangeRef.current?.(data.presence);
            }

            // 1. Apply authoritative synced document state first
            onSyncResponseRef.current?.(data);

            // 2. Open sync gate
            isSyncedRef.current = true;

            // 3. Drain and apply buffered queue in original arrival order
            const buffered = [...eventBufferRef.current];
            eventBufferRef.current = [];

            for (const item of buffered) {
              if (item.type === "document_update") {
                // Drop stale update if its version <= syncedVersion
                if (item.payload.version !== undefined && item.payload.version <= syncedVersion) {
                  continue;
                }
                if (item.payload.version !== undefined) {
                  documentVersionRef.current = item.payload.version;
                  setDocumentVersion(item.payload.version);
                }
                onRemoteUpdateRef.current(item.payload);
              } else if (item.type === "cursor_update") {
                if (!item.payload.cursor) {
                  pendingRemoteCursorMapRef.current.delete(item.payload.userId);
                } else {
                  pendingRemoteCursorMapRef.current.set(item.payload.userId, {
                    userId: item.payload.userId,
                    displayName: item.payload.displayName,
                    color: item.payload.color,
                    cursor: item.payload.cursor,
                  });
                }
                scheduleCursorFlush();
              }
            }
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
          setPresenceUsers((prev) => {
            const exists = prev.some((u) => u.userId === data.user.id);
            if (exists) return prev;
            const next: PresenceUser[] = [
              ...prev,
              {
                userId: data.user.id,
                displayName: data.user.name,
                color: data.user.color || "#2563EB",
                avatarUrl: data.user.avatarUrl,
                joinedAt: new Date().toISOString(),
              },
            ];
            onPresenceChangeRef.current?.(next);
            return next;
          });
          onUserJoinedRef.current?.(data.user);
        }
      });

      // Remote collaborator left (Priority 3: Update BOTH activeUsers AND presenceUsers)
      socket.on(REALTIME_EVENTS.USER_LEFT, (data: UserLeftPayload) => {
        if (data.documentId === documentId) {
          setActiveUsers((prev) => {
            const next = prev.filter((u) => u.id !== data.user.id);
            onActiveUsersChangeRef.current?.(next);
            return next;
          });
          setPresenceUsers((prev) => {
            const next = prev.filter((u) => u.userId !== data.user.id);
            onPresenceChangeRef.current?.(next);
            return next;
          });
          pendingRemoteCursorMapRef.current.delete(data.user.id);
          scheduleCursorFlush();
          onUserLeftRef.current?.(data.user);
        }
      });

      // Remote cursor and selection updates (Immediate processing with Priority 4 rAF batching)
      socket.on(REALTIME_EVENTS.CURSOR_UPDATE, (data: CursorUpdatePayload) => {
        if (data.documentId === documentId) {
          if (user && data.userId === user.id) return; // Do not render self cursor

          if (!data.cursor) {
            pendingRemoteCursorMapRef.current.delete(data.userId);
          } else {
            pendingRemoteCursorMapRef.current.set(data.userId, {
              userId: data.userId,
              displayName: data.displayName,
              color: data.color,
              cursor: data.cursor,
            });
          }
          scheduleCursorFlush();
        }
      });

      // Incoming real-time document broadcast from peer (Priority 2: Sync-gate buffer check)
      socket.on(REALTIME_EVENTS.DOCUMENT_UPDATE, (data: DocumentUpdatePayload) => {
        if (data.documentId === documentId) {
          // Self-echo guard: Ignore broadcasts originated by this client to prevent overwriting active typing
          if (user && data.updatedBy?.id === user.id) {
            if (data.version !== undefined) {
              documentVersionRef.current = data.version;
              setDocumentVersion(data.version);
            }
            return;
          }

          if (!isSyncedRef.current) {
            // Buffer event until sync_response arrives
            eventBufferRef.current.push({ type: "document_update", payload: data });
            return;
          }

          if (data.version !== undefined) {
            documentVersionRef.current = data.version;
            setDocumentVersion(data.version);
          }
          onRemoteUpdateRef.current(data);
        }
      });

      // Priority 3: Tab close handlers (beforeunload + pagehide beacon)
      const handleWindowUnload = () => {
        const sock = socketRef.current;
        if (sock?.connected) {
          sock.emit(REALTIME_EVENTS.LEAVE_DOCUMENT, { documentId });

          if (user?.id && typeof navigator !== "undefined" && navigator.sendBeacon) {
            try {
              const beaconPayload = JSON.stringify({
                documentId,
                userId: user.id,
                socketId: sock.id,
                token: authTokenRef.current,
              });
              const blob = new Blob([beaconPayload], { type: "application/json" });
              navigator.sendBeacon(`${socketUrl}/api/presence/leave`, blob);
            } catch {
              // Ignore sendBeacon errors during unload
            }
          }
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("beforeunload", handleWindowUnload);
        window.addEventListener("pagehide", handleWindowUnload);
      }

      return () => {
        if (typeof window !== "undefined") {
          window.removeEventListener("beforeunload", handleWindowUnload);
          window.removeEventListener("pagehide", handleWindowUnload);
        }
      };
    }

    let cleanupWindowListeners: (() => void) | undefined;
    void initSocket().then((cl) => {
      cleanupWindowListeners = cl;
    });

    return () => {
      isCancelled = true;
      if (cleanupWindowListeners) {
        cleanupWindowListeners();
      }
      if (cursorRafIdRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(cursorRafIdRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (cursorThrottleTimerRef.current) {
        clearTimeout(cursorThrottleTimerRef.current);
      }
      if (socketRef.current) {
        const sock = socketRef.current;
        sock.emit(REALTIME_EVENTS.LEAVE_DOCUMENT, { documentId });
        // Allow outgoing WebSocket frame to flush before closing transport
        setTimeout(() => {
          sock.disconnect();
        }, 50);
        socketRef.current = null;
      }
    };
  }, [documentId, user, initialToken]);

  /**
   * Broadcasts document content, title, status, or category change debounced (250ms).
   * Attaches baseVersion for Option A Last-Write-Wins conflict detection.
   */
  const sendChange = useCallback(
    (change: {
      content?: string;
      title?: string;
      jsonContent?: string;
      status?: string;
      category?: string;
    }) => {
      hasPendingChangesRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        hasPendingChangesRef.current = false;
        const socket = socketRef.current;
        if (socket && socket.connected) {
          socket.emit(
            REALTIME_EVENTS.DOCUMENT_CHANGE,
            {
              documentId,
              ...change,
              baseVersion: documentVersionRef.current,
              updatedAt: new Date().toISOString(),
            },
            (res?: { success: boolean; version?: number; updatedAt?: string }) => {
              if (res?.success && res.version !== undefined) {
                documentVersionRef.current = res.version;
                setDocumentVersion(res.version);
              }
            }
          );
        } else {
          // Offline edits persist via HTTP autosave in local component state.
        }
      }, 150);
    },
    [documentId]
  );

  /**
   * Throttled broadcast (100ms sliding window) for cursor and selection movements (Task 2.4).
   * Unfocused/null cursor positions are broadcast immediately to avoid ghost carets.
   */
  const sendCursor = useCallback(
    (cursor: { from: number; to: number } | null) => {
      const socket = socketRef.current;
      if (!socket || !socket.connected || !user) return;

      const userColor = getUserColor(user.id);

      if (cursor === null) {
        if (cursorThrottleTimerRef.current) {
          clearTimeout(cursorThrottleTimerRef.current);
          cursorThrottleTimerRef.current = null;
        }
        pendingCursorRef.current = null;
        socket.emit(REALTIME_EVENTS.CURSOR_UPDATE, {
          documentId,
          userId: user.id,
          displayName: user.name,
          color: userColor,
          cursor: null,
        });
        lastCursorSentTimeRef.current = Date.now();
        return;
      }

      pendingCursorRef.current = cursor;
      const now = Date.now();
      const elapsed = now - lastCursorSentTimeRef.current;
      const THROTTLE_MS = 100;

      if (elapsed >= THROTTLE_MS && !cursorThrottleTimerRef.current) {
        lastCursorSentTimeRef.current = now;
        socket.emit(REALTIME_EVENTS.CURSOR_UPDATE, {
          documentId,
          userId: user.id,
          displayName: user.name,
          color: userColor,
          cursor,
        });
      } else if (!cursorThrottleTimerRef.current) {
        cursorThrottleTimerRef.current = setTimeout(() => {
          cursorThrottleTimerRef.current = null;
          if (pendingCursorRef.current !== undefined && socketRef.current?.connected) {
            lastCursorSentTimeRef.current = Date.now();
            socketRef.current.emit(REALTIME_EVENTS.CURSOR_UPDATE, {
              documentId,
              userId: user.id,
              displayName: user.name,
              color: userColor,
              cursor: pendingCursorRef.current,
            });
          }
        }, THROTTLE_MS - elapsed);
      }
    },
    [documentId, user]
  );

  return {
    connectionState,
    activeUsers,
    presenceUsers,
    remoteCursors,
    documentVersion,
    sendChange,
    sendCursor,
    hasPendingChangesRef,
  };
}
