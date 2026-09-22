import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRatelimit } from "@/server/lib/rate-limit";

describe("Rate Limiting Infrastructure", () => {
  it("enforces sliding window rate limit on organization invitations (20 max)", async () => {
    const limiter = new MemoryRatelimit(20, 60 * 60 * 1000);
    const orgId = "org-test-rate-limit-123";

    // 20 allowed requests
    for (let i = 0; i < 20; i++) {
      const result = await limiter.limit(orgId);
      expect(result.success).toBe(true);
    }

    // 21st request rejected
    const blocked = await limiter.limit(orgId);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("enforces token lookup rate limit by IP (30 max)", async () => {
    const limiter = new MemoryRatelimit(30, 15 * 60 * 1000);
    const clientIp = "192.168.1.100";

    for (let i = 0; i < 30; i++) {
      const result = await limiter.limit(clientIp);
      expect(result.success).toBe(true);
    }

    const blocked = await limiter.limit(clientIp);
    expect(blocked.success).toBe(false);
  });
});
