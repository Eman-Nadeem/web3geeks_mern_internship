import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import {
  POST as createProjectHandler,
  GET as getProjectsHandler,
} from "@/app/api/organizations/[organizationId]/projects/route";
import {
  GET as getProjectDetailHandler,
  PATCH as updateProjectHandler,
  DELETE as deleteProjectHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/route";
import { POST as inviteHandler } from "@/app/api/organizations/[organizationId]/invitations/route";
import { POST as acceptInviteHandler } from "@/app/api/invitations/[token]/accept/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { UserDTO } from "@/types";

describe("Projects CRUD & Access Control", () => {
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
  let otherOrgId: string;

  beforeEach(async () => {
    inMemoryPrisma.reset();

    // 1. Register Owner
    const ownerRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Alice Owner", email: "alice@example.com", password: "Password123!" },
      }),
      {} as any
    );
    ownerToken = ownerRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    ownerUser = (await ownerRes.json()).data.user;

    // 2. Register Admin
    const adminRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Bob Admin", email: "bob@example.com", password: "Password123!" },
      }),
      {} as any
    );
    adminToken = adminRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    adminUser = (await adminRes.json()).data.user;

    // 3. Register Member 1
    const m1Res = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Carol Member", email: "carol@example.com", password: "Password123!" },
      }),
      {} as any
    );
    member1Token = m1Res.cookies.get(AUTH_COOKIE_NAME)!.value;
    member1User = (await m1Res.json()).data.user;

    // 4. Register Member 2
    const m2Res = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Dave Member", email: "dave@example.com", password: "Password123!" },
      }),
      {} as any
    );
    member2Token = m2Res.cookies.get(AUTH_COOKIE_NAME)!.value;
    member2User = (await m2Res.json()).data.user;

    // 5. Register Outsider
    const outRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Eve Outsider", email: "eve@example.com", password: "Password123!" },
      }),
      {} as any
    );
    outsiderToken = outRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    outsiderUser = (await outRes.json()).data.user;

    // 6. Create Primary Org (Alice)
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

    // Add Carol as MEMBER
    await inMemoryPrisma.membership.create({
      data: { userId: member1User.id, organizationId: orgId, role: "MEMBER" },
    });

    // Add Dave as MEMBER
    await inMemoryPrisma.membership.create({
      data: { userId: member2User.id, organizationId: orgId, role: "MEMBER" },
    });

    // 7. Create Other Org (Eve Outsider)
    const otherOrgRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: outsiderToken,
        body: { name: "Other Corp", slug: "other-corp" },
      }),
      {} as any
    );
    otherOrgId = (await otherOrgRes.json()).data.organization.id;
  });

  describe("Project Creation", () => {
    it("OWNER can create a project and ownerId defaults to creator when omitted", async () => {
      const res = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: ownerToken,
          body: { name: "Platform Redesign", description: "Modernize stack" },
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.project.name).toBe("Platform Redesign");
      expect(json.data.project.ownerId).toBe(ownerUser.id);
    });

    it("ADMIN can create a project and assign ownerId to an existing org member", async () => {
      const res = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: adminToken,
          body: {
            name: "Carol Project",
            ownerId: member1User.id,
          },
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.project.ownerId).toBe(member1User.id);
    });

    it("MEMBER gets 403 when attempting to create a project", async () => {
      const res = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: member1Token,
          body: { name: "Unauthorized Project" },
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(403);
    });

    it("ownerId must be an existing org member (rejects with 400 if user is outside org)", async () => {
      const res = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: ownerToken,
          body: {
            name: "Invalid Owner Project",
            ownerId: outsiderUser.id,
          },
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Owner must be an organization member");
    });
  });

  describe("Project Visibility & Listing", () => {
    let projectCarolOwnedId: string;
    let projectAliceOwnedId: string;

    beforeEach(async () => {
      // 1. Create Project owned by Carol (created by Alice)
      const res1 = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: ownerToken,
          body: { name: "Carol Alpha", ownerId: member1User.id },
        }),
        { params: { organizationId: orgId } } as any
      );
      projectCarolOwnedId = (await res1.json()).data.project.id;

      // 2. Create Project owned by Alice
      const res2 = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: ownerToken,
          body: { name: "Alice Secret", ownerId: ownerUser.id },
        }),
        { params: { organizationId: orgId } } as any
      );
      projectAliceOwnedId = (await res2.json()).data.project.id;
    });

    it("org OWNER and ADMIN can view all projects in the organization", async () => {
      const resOwner = await getProjectsHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId } } as any
      );
      const jsonOwner = await resOwner.json();
      expect(jsonOwner.data.projects.length).toBe(2);

      const resAdmin = await getProjectsHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "GET",
          token: adminToken,
        }),
        { params: { organizationId: orgId } } as any
      );
      const jsonAdmin = await resAdmin.json();
      expect(jsonAdmin.data.projects.length).toBe(2);
    });

    it("regular MEMBER sees only projects they own or belong to in the list", async () => {
      // Carol is owner of Carol Alpha, but not on Alice Secret
      const resCarol = await getProjectsHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "GET",
          token: member1Token,
        }),
        { params: { organizationId: orgId } } as any
      );
      const jsonCarol = await resCarol.json();
      expect(jsonCarol.data.projects.length).toBe(1);
      expect(jsonCarol.data.projects[0].name).toBe("Carol Alpha");

      // Dave is not on any project yet
      const resDave = await getProjectsHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "GET",
          token: member2Token,
        }),
        { params: { organizationId: orgId } } as any
      );
      const jsonDave = await resDave.json();
      expect(jsonDave.data.projects.length).toBe(0);
    });

    it("non-member org MEMBER gets 403 on GET /projects/:projectId for a project they are not on", async () => {
      const res = await getProjectDetailHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectAliceOwnedId}`, {
          method: "GET",
          token: member2Token, // Dave
        }),
        { params: { organizationId: orgId, projectId: projectAliceOwnedId } } as any
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("You do not have access to this project");
    });

    it("project owner can view their project detail", async () => {
      const res = await getProjectDetailHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectCarolOwnedId}`, {
          method: "GET",
          token: member1Token, // Carol
        }),
        { params: { organizationId: orgId, projectId: projectCarolOwnedId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.project.name).toBe("Carol Alpha");
    });
  });

  describe("Project Update & Delete", () => {
    let projectId: string;

    beforeEach(async () => {
      const res = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: ownerToken,
          body: { name: "Project Beta", ownerId: member1User.id },
        }),
        { params: { organizationId: orgId } } as any
      );
      projectId = (await res.json()).data.project.id;
    });

    it("Project Owner can PATCH project details", async () => {
      const res = await updateProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}`, {
          method: "PATCH",
          token: member1Token, // Carol is project owner
          body: { name: "Project Beta Updated", status: "ACTIVE" },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.project.name).toBe("Project Beta Updated");
      expect(json.data.project.status).toBe("ACTIVE");
    });

    it("Project Owner gets 403 on DELETE (only org OWNER/ADMIN can delete)", async () => {
      const res = await deleteProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}`, {
          method: "DELETE",
          token: member1Token, // Carol is project owner, but only org MEMBER
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(403);
    });

    it("org ADMIN can delete a project", async () => {
      const res = await deleteProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(200);
    });
  });

  describe("Cross-Org Tenant Isolation (IDOR)", () => {
    let orgAProjectId: string;

    beforeEach(async () => {
      const res = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
          method: "POST",
          token: ownerToken,
          body: { name: "Org A Secret Project" },
        }),
        { params: { organizationId: orgId } } as any
      );
      orgAProjectId = (await res.json()).data.project.id;
    });

    it("a valid projectId from Org A requested under Org B returns 404", async () => {
      const res = await getProjectDetailHandler(
        createRequest(`http://localhost:3000/api/organizations/${otherOrgId}/projects/${orgAProjectId}`, {
          method: "GET",
          token: outsiderToken, // Eve is owner of otherOrg
        }),
        { params: { organizationId: otherOrgId, projectId: orgAProjectId } } as any
      );

      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.message).toContain("Project not found");
    });
  });
});
