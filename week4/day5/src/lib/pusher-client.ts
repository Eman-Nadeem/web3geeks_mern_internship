/**
 * Browser-side Pusher client singleton.
 * Only initialises when NEXT_PUBLIC_PUSHER_KEY and NEXT_PUBLIC_PUSHER_CLUSTER are set.
 * Returns null in SSR and when unconfigured — callers must handle null gracefully.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pusherInstance: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPusherClient(): any {
  if (typeof window === "undefined") return null;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (!key || !cluster) return null;

  if (!_pusherInstance) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Pusher = require("pusher-js");
    _pusherInstance = new Pusher(key, {
      cluster,
      authEndpoint: "/api/pusher/auth",
      authTransport: "ajax",
    });
  }

  return _pusherInstance;
}
