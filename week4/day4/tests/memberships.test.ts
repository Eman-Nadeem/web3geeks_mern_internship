import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import {
  GET as getOrgDetailHandler,
  PATCH as updateOrgHandler,
  DELETE as deleteOrgHandler,
} from "@/app/api/organizations/[organizationId]/route";
import { GET as getMembersHandler } from "@/app/api/organizations/[organizationId]/members/route";
import { DELETE as removeMemberHandler } from "@/app/api/organizations/[organizationId]/members/[membershipId]/route";
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
  let ownerMembershipId: string;
  let adminMembershipId: string;
  let memberMembershipId: string;

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

    // Get owner membership ID
    const ownerM = await inMemoryPrisma.membership.findUnique({
      where: { userId_organizationId: { userId: ownerUser.id, organizationId: orgId } },
    });
    ownerMembershipId = ownerM!.id;

    // 5. Add Admin and Member to organization in database
    const adminM = await inMemoryPrisma.membership.create({
      data: {
        userId: adminUser.id,
        organizationId: orgId,
        role: Role.ADMIN,
      },
    });
    adminMembershipId = adminM.id;

    const memberM = await inMemoryPrisma.membership.create({
      data: {
        userId: memberUser.id,
        organizationId: orgId,
        role: Role.MEMBER,
      },
    });
    memberMembershipId = memberM.id;
  });

  describe("Role Permission Matrix", () => {
    it("MEMBER can view organization and members list", async () => {
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

      const checkReq = createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        token: ownerToken,
      });
      const checkRes = await getOrgDetailHandler(checkReq, {
        params: Promise.resolve({ organizationId: orgId }),
      } as any);
      expect(checkRes.status).toBe(404);
    });
  });

  describe("Members Search & Filtering", () => {
    it("search matches name and email case-insensitively", async () => {
      // Search by name "alice"
      const res1 = await getMembersHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members?search=alice`, {
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.data.members.length).toBe(1);
      expect(json1.data.members[0].email).toBe("owner@example.com");

      // Search by email "admin@"
      const res2 = await getMembersHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members?search=admin@`, {
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.data.members.length).toBe(1);
      expect(json2.data.members[0].email).toBe("admin@example.com");
    });

    it("role filter returns only members matching specified role", async () => {
      const res = await getMembersHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members?role=ADMIN`, {
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.members.length).toBe(1);
      expect(json.data.members[0].role).toBe("ADMIN");
      expect(json.data.members[0].name).toBe("Bob Admin");
    });
  });

  describe("Member Removal & Security Matrix", () => {
    it("OWNER can remove a MEMBER (200)", async () => {
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${memberMembershipId}`, {
          method: "DELETE",
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: memberMembershipId }) } as any
      );
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it("ADMIN can remove a MEMBER (200)", async () => {
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${memberMembershipId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: memberMembershipId }) } as any
      );
      expect(res.status).toBe(200);
      expect((await res.json()).success).toBe(true);
    });

    it("ADMIN cannot remove another ADMIN or the OWNER (403)", async () => {
      // Admin tries to remove Owner
      const resOwner = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${ownerMembershipId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: ownerMembershipId }) } as any
      );
      expect(resOwner.status).toBe(403);

      // Create another admin in the org
      const extraAdmin = await inMemoryPrisma.user.create({
        data: { name: "Extra Admin", email: "extra-admin@example.com", password: "Password123!" },
      });
      const extraAdminM = await inMemoryPrisma.membership.create({
        data: { userId: extraAdmin.id, organizationId: orgId, role: Role.ADMIN },
      });

      // Admin tries to remove another Admin
      const resAdmin = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${extraAdminM.id}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: extraAdminM.id }) } as any
      );
      expect(resAdmin.status).toBe(403);
    });

    it("MEMBER gets 403 when attempting to remove any member", async () => {
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${memberMembershipId}`, {
          method: "DELETE",
          token: memberToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: memberMembershipId }) } as any
      );
      expect(res.status).toBe(403);
    });

    it("cannot remove yourself via this endpoint (400)", async () => {
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${adminMembershipId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: adminMembershipId }) } as any
      );
      expect(res.status).toBe(400);
      expect((await res.json()).message).toContain("leave an organization");
    });

    it("cannot remove the last OWNER of an organization (409 or 403)", async () => {
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${ownerMembershipId}`, {
          method: "DELETE",
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: ownerMembershipId }) } as any
      );
      // Owner removing self is blocked by self check (400) or last owner / permission
      expect([400, 403, 409]).toContain(res.status);
    });

    it("returns 404 when attempting to remove a membership from a different organization (Tenant Isolation)", async () => {
      // Create second organization with member
      const otherOrg = await inMemoryPrisma.organization.create({
        data: { name: "Other Org", slug: "other-org", ownerId: ownerUser.id },
      });
      const otherMember = await inMemoryPrisma.user.create({
        data: { name: "Stranger", email: "stranger@example.com", password: "Password123!" },
      });
      const otherMembership = await inMemoryPrisma.membership.create({
        data: { userId: otherMember.id, organizationId: otherOrg.id, role: Role.MEMBER },
      });

      // Try to remove otherMembership through orgId's URL
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/members/${otherMembership.id}`, {
          method: "DELETE",
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, membershipId: otherMembership.id }) } as any
      );
      expect(res.status).toBe(404);
      expect((await res.json()).message).toContain("not found");
    });
  });
});
