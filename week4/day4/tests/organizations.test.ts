import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import {
  GET as getOrgsHandler,
  POST as createOrgHandler,
} from "@/app/api/organizations/route";
import {
  GET as getOrgDetailHandler,
  PATCH as updateOrgHandler,
  DELETE as deleteOrgHandler,
} from "@/app/api/organizations/[organizationId]/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

describe("Organizations Multi-Tenant API Routes", () => {
  let userAToken: string;
  let userBToken: string;

  beforeEach(async () => {
    // Register User A
    const resA = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "User A", email: "usera@example.com", password: "Password123!" },
      }),
      {} as any
    );
    userAToken = resA.cookies.get(AUTH_COOKIE_NAME)!.value;

    // Register User B
    const resB = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "User B", email: "userb@example.com", password: "Password123!" },
      }),
      {} as any
    );
    userBToken = resB.cookies.get(AUTH_COOKIE_NAME)!.value;
  });

  describe("POST /api/organizations", () => {
    it("should create organization with creator as OWNER and ignore client-supplied role/ownerId", async () => {
      const req = createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: userAToken,
        body: {
          name: "Acme Corporation",
          slug: "acme-corp",
          role: "MEMBER", // Attacker trying to spoof role
          ownerId: "some-random-id", // Attacker trying to spoof owner
        },
      });

      const res = await createOrgHandler(req, {} as any);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.organization.name).toBe("Acme Corporation");
      expect(json.data.organization.slug).toBe("acme-corp");
      expect(json.data.organization.role).toBe("OWNER");
      expect(json.data.organization.memberCount).toBe(1);
    });

    it("should reject duplicate slug with 409", async () => {
      const req1 = createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: userAToken,
        body: { name: "Acme Corp", slug: "acme-corp" },
      });
      await createOrgHandler(req1, {} as any);

      const req2 = createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: userBToken,
        body: { name: "Another Acme", slug: "acme-corp" },
      });
      const res = await createOrgHandler(req2, {} as any);
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Organization slug already taken");
    });
  });

  describe("Multi-tenant Data Isolation", () => {
    it("should ensure User A cannot GET, PATCH, or DELETE User B's organization", async () => {
      // User B creates an org
      const createRes = await createOrgHandler(
        createRequest("http://localhost:3000/api/organizations", {
          method: "POST",
          token: userBToken,
          body: { name: "User B Secret Org", slug: "user-b-org" },
        }),
        {} as any
      );
      const bOrg = (await createRes.json()).data.organization;

      // User A attempts to GET User B's org
      const getReq = createRequest(`http://localhost:3000/api/organizations/${bOrg.id}`, {
        token: userAToken,
      });
      const getRes = await getOrgDetailHandler(getReq, {
        params: Promise.resolve({ organizationId: bOrg.id }),
      } as any);
      expect(getRes.status).toBe(403);
      expect((await getRes.json()).message).toBe("You do not have access to this organization");

      // User A attempts to PATCH User B's org
      const patchReq = createRequest(`http://localhost:3000/api/organizations/${bOrg.id}`, {
        method: "PATCH",
        token: userAToken,
        body: { name: "Hacked Org Name" },
      });
      const patchRes = await updateOrgHandler(patchReq, {
        params: Promise.resolve({ organizationId: bOrg.id }),
      } as any);
      expect(patchRes.status).toBe(403);

      // User A attempts to DELETE User B's org
      const deleteReq = createRequest(`http://localhost:3000/api/organizations/${bOrg.id}`, {
        method: "DELETE",
        token: userAToken,
      });
      const deleteRes = await deleteOrgHandler(deleteReq, {
        params: Promise.resolve({ organizationId: bOrg.id }),
      } as any);
      expect(deleteRes.status).toBe(403);
    });

    it("GET /api/organizations returns only organizations the user belongs to", async () => {
      // User A creates Org A
      await createOrgHandler(
        createRequest("http://localhost:3000/api/organizations", {
          method: "POST",
          token: userAToken,
          body: { name: "Org A", slug: "org-a" },
        }),
        {} as any
      );

      // User B creates Org B
      await createOrgHandler(
        createRequest("http://localhost:3000/api/organizations", {
          method: "POST",
          token: userBToken,
          body: { name: "Org B", slug: "org-b" },
        }),
        {} as any
      );

      // User A lists organizations
      const listReqA = createRequest("http://localhost:3000/api/organizations", {
        token: userAToken,
      });
      const listResA = await getOrgsHandler(listReqA, {} as any);
      const listJsonA = await listResA.json();
      expect(listJsonA.data.organizations.length).toBe(1);
      expect(listJsonA.data.organizations[0].slug).toBe("org-a");

      // User B lists organizations
      const listReqB = createRequest("http://localhost:3000/api/organizations", {
        token: userBToken,
      });
      const listResB = await getOrgsHandler(listReqB, {} as any);
      const listJsonB = await listResB.json();
      expect(listJsonB.data.organizations.length).toBe(1);
      expect(listJsonB.data.organizations[0].slug).toBe("org-b");
    });
  });

  describe("Non-existent Org and Invalid ID Validation", () => {
    it("should return 400 for invalid UUID format", async () => {
      const req = createRequest("http://localhost:3000/api/organizations/invalid-uuid", {
        token: userAToken,
      });
      const res = await getOrgDetailHandler(req, {
        params: Promise.resolve({ organizationId: "invalid-uuid" }),
      } as any);
      expect(res.status).toBe(400);
      expect((await res.json()).message).toBe("Invalid organization ID");
    });

    it("should return 404 for non-existent organization UUID", async () => {
      const randomUuid = crypto.randomUUID();
      const req = createRequest(`http://localhost:3000/api/organizations/${randomUuid}`, {
        token: userAToken,
      });
      const res = await getOrgDetailHandler(req, {
        params: Promise.resolve({ organizationId: randomUuid }),
      } as any);
      expect(res.status).toBe(404);
      expect((await res.json()).message).toBe("Organization not found");
    });
  });
});
