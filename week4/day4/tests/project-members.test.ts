import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import { POST as createProjectHandler } from "@/app/api/organizations/[organizationId]/projects/route";
import {
  GET as getMembersHandler,
  POST as addMemberHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/members/route";
import { DELETE as removeMemberHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/members/[userId]/route";
import { POST as inviteHandler } from "@/app/api/organizations/[organizationId]/invitations/route";
import { POST as acceptInviteHandler } from "@/app/api/invitations/[token]/accept/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { UserDTO } from "@/types";

describe("Project Members Management", () => {
  let ownerToken: string;
  let adminToken: string;
  let member1Token: string;
  let member2Token: string;
  let outsiderToken: string;

  let ownerUser: UserDTO;
  let adminUser: UserDTO;
  let member1User: UserDTO;
  let member2User: UserDTO;
  let outsiderUser: UserDTO;

  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    inMemoryPrisma.reset();

    // 1. Register Users
    const ownerRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Alice Owner", email: "alice@example.com", password: "Password123!" },
      }),
      {} as any
    );
    ownerToken = ownerRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    ownerUser = (await ownerRes.json()).data.user;

    const adminRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Bob Admin", email: "bob@example.com", password: "Password123!" },
      }),
      {} as any
    );
    adminToken = adminRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    adminUser = (await adminRes.json()).data.user;

    const m1Res = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Carol Member", email: "carol@example.com", password: "Password123!" },
      }),
      {} as any
    );
    member1Token = m1Res.cookies.get(AUTH_COOKIE_NAME)!.value;
    member1User = (await m1Res.json()).data.user;

    const m2Res = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Dave Member", email: "dave@example.com", password: "Password123!" },
      }),
      {} as any
    );
    member2Token = m2Res.cookies.get(AUTH_COOKIE_NAME)!.value;
    member2User = (await m2Res.json()).data.user;

    const outRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Eve Foreign", email: "eve@example.com", password: "Password123!" },
      }),
      {} as any
    );
    outsiderToken = outRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    outsiderUser = (await outRes.json()).data.user;

    // 2. Create Org
    const orgRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: ownerToken,
        body: { name: "Acme Corp", slug: "acme-corp" },
      }),
      {} as any
    );
    orgId = (await orgRes.json()).data.organization.id;

    // Add Bob as ADMIN
    await inMemoryPrisma.membership.create({
      data: { userId: adminUser.id, organizationId: orgId, role: "ADMIN" },
    });

    // Add Carol and Dave as MEMBERS
    await inMemoryPrisma.membership.create({
      data: { userId: member1User.id, organizationId: orgId, role: "MEMBER" },
    });
    await inMemoryPrisma.membership.create({
      data: { userId: member2User.id, organizationId: orgId, role: "MEMBER" },
    });

    // 3. Create Project owned by Alice
    const projRes = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Project Platform" },
      }),
      { params: { organizationId: orgId } } as any
    );
    projectId = (await projRes.json()).data.project.id;
  });

  describe("Add Project Member", () => {
    it("adding a user from a DIFFERENT organization is rejected with 400 even with valid UUID", async () => {
      const res = await addMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "POST",
          token: ownerToken,
          body: { userId: outsiderUser.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("User is not a member of this organization");
    });

    it("adding an already-added project member returns 409", async () => {
      // First addition
      const res1 = await addMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "POST",
          token: ownerToken,
          body: { userId: member1User.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );
      expect(res1.status).toBe(201);

      // Duplicate addition
      const res2 = await addMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "POST",
          token: ownerToken,
          body: { userId: member1User.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );
      expect(res2.status).toBe(409);
      const json = await res2.json();
      expect(json.message).toContain("already a project member");
    });

    it("adding the project owner returns 409", async () => {
      const res = await addMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "POST",
          token: ownerToken,
          body: { userId: ownerUser.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(409);
    });

    it("a regular project member cannot add other members (403)", async () => {
      // Alice adds Carol
      await addMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "POST",
          token: ownerToken,
          body: { userId: member1User.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      // Carol tries to add Dave
      const res = await addMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "POST",
          token: member1Token,
          body: { userId: member2User.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(403);
    });
  });

  describe("Remove Project Member", () => {
    beforeEach(async () => {
      // Add Carol to project
      await addMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "POST",
          token: ownerToken,
          body: { userId: member1User.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );
    });

    it("cannot remove the project owner (returns 400)", async () => {
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members/${ownerUser.id}`, {
          method: "DELETE",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId, userId: ownerUser.id } } as any
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Reassign the project owner before removing them");
    });

    it("Org Admin or Project Owner can remove a project member (200)", async () => {
      const res = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members/${member1User.id}`, {
          method: "DELETE",
          token: adminToken, // Bob is Org Admin
        }),
        { params: { organizationId: orgId, projectId, userId: member1User.id } } as any
      );

      expect(res.status).toBe(200);

      // Check member is removed
      const listRes = await getMembersHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId } } as any
      );
      const json = await listRes.json();
      expect(json.data.members.some((m: any) => m.userId === member1User.id)).toBe(false);
    });
  });
});
