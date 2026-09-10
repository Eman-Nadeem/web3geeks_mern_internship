import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server } from "../server/socket";

describe("Regression Tests — Internal Socket Bridge Endpoints Authentication", () => {
  let port: number;
  const TEST_SECRET = "test_internal_bridge_secret_secure_value_123";

  beforeAll(async () => {
    process.env.INTERNAL_BRIDGE_SECRET = TEST_SECRET;

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 3001;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  const endpoints = [
    {
      name: "/api/socket/evict",
      body: { documentId: "doc_test", targetUserId: "user_test", reason: "Testing eviction" },
    },
    {
      name: "/api/socket/role-change",
      body: { documentId: "doc_test", targetUserId: "user_test", newRole: "viewer" },
    },
    {
      name: "/api/socket/document-restored",
      body: {
        documentId: "doc_test",
        version: 2,
        restoredFromVersion: 1,
        title: "Restored Title",
        content: "<p>Restored</p>",
        restoredBy: { id: "u1", name: "Tester" },
        restoredAt: new Date().toISOString(),
      },
    },
    {
      name: "/api/socket/collaborator-added",
      body: {
        documentId: "doc_test",
        collaborator: {
          id: "collab_1",
          userId: "user_test",
          role: "editor",
          user: { id: "user_test", name: "Tester", email: "tester@example.com" },
        },
      },
    },
  ];

  for (const ep of endpoints) {
    describe(`Bridge Endpoint: ${ep.name}`, () => {
      it("(a) rejects request with 401 when x-internal-bridge-secret header is missing", async () => {
        const res = await fetch(`http://localhost:${port}${ep.name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(ep.body),
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain("Unauthorized: Invalid or missing internal bridge secret");
      });

      it("(b) rejects request with 401 when x-internal-bridge-secret header is incorrect", async () => {
        const res = await fetch(`http://localhost:${port}${ep.name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-bridge-secret": "wrong_forged_secret_token",
          },
          body: JSON.stringify(ep.body),
        });

        expect(res.status).toBe(401);
        const data = await res.json();
        expect(data.error).toContain("Unauthorized: Invalid or missing internal bridge secret");
      });

      it("(c) accepts request with 200 when x-internal-bridge-secret matches expected secret", async () => {
        const res = await fetch(`http://localhost:${port}${ep.name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-bridge-secret": TEST_SECRET,
          },
          body: JSON.stringify(ep.body),
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
      });
    });
  }
});
