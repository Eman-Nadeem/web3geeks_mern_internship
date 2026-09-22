/**
 * Pusher server-side client.
 * Gracefully no-ops when PUSHER_* env vars are absent (dev without a Pusher account).
 * Import `triggerEvent` in any service to broadcast real-time events.
 */

import { env } from "../config/env";

interface PusherLike {
  trigger(channel: string, event: string, data: unknown): Promise<unknown>;
}

class NoopPusher implements PusherLike {
  async trigger(_channel: string, _event: string, _data: unknown) {
    return {};
  }
}

let _pusher: PusherLike | null = null;

function getPusher(): PusherLike {
  if (_pusher) return _pusher;

  const { PUSHER_APP_ID, PUSHER_KEY, PUSHER_SECRET, PUSHER_CLUSTER } = env;

  if (PUSHER_APP_ID && PUSHER_KEY && PUSHER_SECRET && PUSHER_CLUSTER) {
    // Dynamic import keeps pusher-js out of the edge-runtime bundle if unused
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Pusher = require("pusher");
    _pusher = new Pusher({
      appId: PUSHER_APP_ID,
      key: PUSHER_KEY,
      secret: PUSHER_SECRET,
      cluster: PUSHER_CLUSTER,
      useTLS: true,
    }) as PusherLike;
  } else {
    _pusher = new NoopPusher();
  }

  return _pusher;
}

/**
 * Trigger a Pusher event.  Always awaitable; silently no-ops in dev without credentials.
 */
export async function triggerEvent(
  channel: string,
  event: string,
  data: unknown
): Promise<void> {
  try {
    await getPusher().trigger(channel, event, data);
  } catch (err) {
    // Never let a Pusher failure crash an API route
    console.error("[Pusher] triggerEvent failed:", err);
  }
}

/** Channel name helpers — keep naming consistent across server and client */
export const Channels = {
  org: (orgId: string) => `private-org-${orgId}`,
  project: (projectId: string) => `private-project-${projectId}`,
  user: (userId: string) => `private-user-${userId}`,
} as const;
