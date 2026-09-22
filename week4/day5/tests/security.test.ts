import { describe, it, expect } from "vitest";
import { GET as healthHandler } from "@/app/api/health/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { GET as catchAllHandler } from "@/app/api/[...slug]/route";
import { createRequest } from "./helpers/requests";

describe("Security & Infrastructure API Routes", () => {
  describe("GET /api/health", () => {
    it("should return 200 and healthy database status", async () => {
      const req = createRequest("http://localhost:3000/api/health");
      const res = await healthHandler(req, {} as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("healthy");
      expect(json.data.database).toBe("connected");
    });
  });

  describe("Origin CSRF Protection", () => {
    it("should reject mutating request with mismatched cross-origin header with 403", async () => {
      const req = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          name: "Attacker User",
          email: "attacker@malicious.com",
          password: "Password123!",
        },
        headers: {
          host: "localhost:3000",
          origin: "https://malicious-site.com",
        },
      });

      const res = await registerHandler(req, {} as any);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Cross-origin request rejected");
    });

    it("should accept mutating request with matching origin header", async () => {
      const req = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          name: "Legit User",
          email: "legit@example.com",
          password: "Password123!",
        },
        headers: {
          host: "localhost:3000",
          origin: "http://localhost:3000",
        },
      });

      const res = await registerHandler(req, {} as any);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("Catch-all Route Handler", () => {
    it("should return 404 envelope for undefined API routes", async () => {
      const req = createRequest("http://localhost:3000/api/non-existent-endpoint");
      const res = await catchAllHandler(req, {} as any);
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Route not found");
    });
  });
});
