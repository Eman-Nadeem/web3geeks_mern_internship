import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import {
  GET as getOrgDetailHandler,
  PATCH as updateOrgHandler,
  DELETE as deleteOrgHandler,
} from "@/app/api/organizations/[organizationId]/route";
import { GET as getMembersHandler } from "@/app/api/organizations/[organizationId]/members/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { Role, UserDTO } from "@/types";

describe("Memberships and Role-Based Access Control", () => {
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let ownerUser: UserDTO;
  let adminUser: UserDTO;
  let memberUser: UserDTO;
  let orgId: string;

  beforeEach(async () => {
    // 1. Register Owner
    const ownerRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Alice Owner", email: "owner@example.com", password: "Password123!" },
      }),
      {} as any
    );
    ownerToken = ownerRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    ownerUser = (await ownerRes.json()).data.user;

    // 2. Register Admin
    const adminRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Bob Admin", email: "admin@example.com", password: "Password123!" },
      }),
      {} as any
    );
    adminToken = adminRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    adminUser = (await adminRes.json()).data.user;

    // 3. Register Member
    const memberRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Carol Member", email: "member@example.com", password: "Password123!" },
      }),
      {} as any
    );
    memberToken = memberRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    memberUser = (await memberRes.json()).data.user;

    // 4. Owner creates the organization
    const orgRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: ownerToken,
        body: { name: "Acme Enterprise", slug: "acme-ent" },
      }),
      {} as any
    );
    orgId = (await orgRes.json()).data.organization.id;

    // 5. Add Admin and Member to organization in database
    await inMemoryPrisma.membership.create({
      data: {
        userId: adminUser.id,
        organizationId: orgId,
        role: Role.ADMIN,
      },
    });

    await inMemoryPrisma.membership.create({
      data: {
        userId: memberUser.id,
        organizationId: orgId,
        role: Role.MEMBER,
      },
    });
  });

  describe("Role Permission Matrix", () => {
    it("MEMBER can view organization and members list", async () => {
      // GET org detail
      const getReq = createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        token: memberToken,
      });
      const getRes = await getOrgDetailHandler(getReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.data.organization.name).toBe("Acme Enterprise");
      expect(getJson.data.organization.currentUserRole).toBe("MEMBER");
      expect(getJson.data.organization.counts.members).toBe(3);

      // GET members
      const membersReq = createRequest(
        `http://localhost:3000/api/organizations/${orgId}/members`,
        { token: memberToken }
      );
      const membersRes = await getMembersHandler(membersReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(membersRes.status).toBe(200);
      const membersJson = await membersRes.json();
      expect(membersJson.data.members.length).toBe(3);
    });

    it("MEMBER cannot PATCH (rename) organization (403)", async () => {
      const patchReq = createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: memberToken,
        body: { name: "Member Renamed Org" },
      });
      const patchRes = await updateOrgHandler(patchReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(patchRes.status).toBe(403);
      expect((await patchRes.json()).message).toBe(
        "You do not have permission to perform this action"
      );
    });

    it("ADMIN can PATCH (rename) organization (200) but cannot DELETE (403)", async () => {
      // ADMIN PATCH
      const patchReq = createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: adminToken,
        body: { name: "Admin Renamed Org" },
      });
      const patchRes = await updateOrgHandler(patchReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(patchRes.status).toBe(200);
      expect((await patchRes.json()).data.organization.name).toBe("Admin Renamed Org");

      // ADMIN DELETE
      const deleteReq = createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "DELETE",
        token: adminToken,
      });
      const deleteRes = await deleteOrgHandler(deleteReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(deleteRes.status).toBe(403);
      expect((await deleteRes.json()).message).toBe(
        "You do not have permission to perform this action"
      );
    });

    it("OWNER can DELETE organization (200)", async () => {
      const deleteReq = createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "DELETE",
        token: ownerToken,
      });
      const deleteRes = await deleteOrgHandler(deleteReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(deleteRes.status).toBe(200);
      expect((await deleteRes.json()).success).toBe(true);

      // Verify org is deleted
      const checkReq = createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        token: ownerToken,
      });
      const checkRes = await getOrgDetailHandler(checkReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(checkRes.status).toBe(404);
    });
  });

  describe("Multi-org role consistency", () => {
    it("User with different roles in Org 1 and Org 2 gets correct role in each", async () => {
      // Bob (Admin in Org 1) creates Org 2 (where Bob is OWNER)
      const org2Res = await createOrgHandler(
        createRequest("http://localhost:3000/api/organizations", {
          method: "POST",
          token: adminToken,
          body: { name: "Bob Personal Org", slug: "bob-personal" },
        }),
        {} as any
      );
      const org2Id = (await org2Res.json()).data.organization.id;

      // In Org 1: Bob is ADMIN (cannot delete)
      const deleteOrg1 = await deleteOrgHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(deleteOrg1.status).toBe(403);

      // In Org 2: Bob is OWNER (can delete)
      const deleteOrg2 = await deleteOrgHandler(
        createRequest(`http://localhost:3000/api/organizations/${org2Id}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: org2Id }) } as any
      );
      expect(deleteOrg2.status).toBe(200);
    });
  });
});
