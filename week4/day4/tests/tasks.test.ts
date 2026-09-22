import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import { POST as createProjectHandler } from "@/app/api/organizations/[organizationId]/projects/route";
import { POST as addProjectMemberHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/members/route";
import {
  POST as createTaskHandler,
  GET as getTasksHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/route";
import {
  GET as getTaskDetailHandler,
  PATCH as updateTaskHandler,
  DELETE as deleteTaskHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { UserDTO } from "@/types";

describe("Tasks CRUD, Split Validation & Permissions", () => {
  let ownerToken: string;
  let adminToken: string;
  let member1Token: string; // Carol
  let member2Token: string; // Dave
  let nonProjectMemberToken: string; // Frank (in org, not on project)

  let ownerUser: UserDTO;
  let adminUser: UserDTO;
  let member1User: UserDTO;
  let member2User: UserDTO;
  let nonProjectMemberUser: UserDTO;

  let orgId: string;
  let projectId: string;

  beforeEach(async () => {
    inMemoryPrisma.reset();

    // 1. Register users
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

    const frankRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Frank OrgOnly", email: "frank@example.com", password: "Password123!" },
      }),
      {} as any
    );
    nonProjectMemberToken = frankRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    nonProjectMemberUser = (await frankRes.json()).data.user;

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

    // Add memberships
    await inMemoryPrisma.membership.create({
      data: { userId: adminUser.id, organizationId: orgId, role: "ADMIN" },
    });
    await inMemoryPrisma.membership.create({
      data: { userId: member1User.id, organizationId: orgId, role: "MEMBER" },
    });
    await inMemoryPrisma.membership.create({
      data: { userId: member2User.id, organizationId: orgId, role: "MEMBER" },
    });
    await inMemoryPrisma.membership.create({
      data: { userId: nonProjectMemberUser.id, organizationId: orgId, role: "MEMBER" },
    });

    // 3. Create Project owned by Alice
    const projRes = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Engineering Core" },
      }),
      { params: { organizationId: orgId } } as any
    );
    projectId = (await projRes.json()).data.project.id;

    // Add Carol and Dave as project members (Frank is NOT on project)
    await inMemoryPrisma.projectMember.create({
      data: { projectId, userId: member1User.id, addedById: ownerUser.id },
    });
    await inMemoryPrisma.projectMember.create({
      data: { projectId, userId: member2User.id, addedById: ownerUser.id },
    });
  });

  describe("Task Creation & Assignment Validation", () => {
    it("creating with an assigneeId who is NOT a project member returns 400", async () => {
      const res = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
          method: "POST",
          token: ownerToken,
          body: {
            title: "Task with invalid assignee",
            assigneeId: nonProjectMemberUser.id, // Frank is in org, but NOT on project
          },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Assignee must be a project member");
    });

    it("project member can create a task and assign to project owner or member", async () => {
      const res = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
          method: "POST",
          token: member1Token, // Carol
          body: {
            title: "Write documentation",
            priority: "HIGH",
            assigneeId: member2User.id, // Dave
          },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.task.title).toBe("Write documentation");
      expect(json.data.task.createdById).toBe(member1User.id);
      expect(json.data.task.assigneeId).toBe(member2User.id);
      expect(json.data.task.isAssigneeActive).toBe(true);
    });

    it("org member not on project gets 403 when attempting to create a task", async () => {
      const res = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
          method: "POST",
          token: nonProjectMemberToken, // Frank
          body: { title: "Unauthorized task" },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );

      expect(res.status).toBe(403);
    });
  });

  describe("Split Validation: Field Edits vs. Status Changes", () => {
    let taskId: string;

    beforeEach(async () => {
      // Carol creates a task and assigns to Dave
      const res = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
          method: "POST",
          token: member1Token, // Carol (creator)
          body: {
            title: "Optimize queries",
            description: "Add compound index",
            assigneeId: member2User.id, // Dave (assignee)
          },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );
      taskId = (await res.json()).data.task.id;
    });

    it("creator can edit their own task fields", async () => {
      const res = await updateTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          token: member1Token, // Carol (creator)
          body: { title: "Optimize queries - v2", priority: "URGENT" },
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.task.title).toBe("Optimize queries - v2");
      expect(json.data.task.priority).toBe("URGENT");
    });

    it("assignee can change task status alone (even though not creator or owner)", async () => {
      const res = await updateTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          token: member2Token, // Dave (assignee)
          body: { status: "IN_PROGRESS" },
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.task.status).toBe("IN_PROGRESS");
    });

    it("reassigning a task to non-project member returns 400", async () => {
      const res = await updateTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          token: member1Token,
          body: { assigneeId: nonProjectMemberUser.id },
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.message).toContain("Assignee must be a project member");
    });

    it("any project member can reassign a task to another project member", async () => {
      const res = await updateTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          token: member2Token, // Dave reassigns to Alice (owner)
          body: { assigneeId: ownerUser.id },
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.task.assigneeId).toBe(ownerUser.id);
    });
  });

  describe("completedAt Timestamp Management", () => {
    let taskId: string;

    beforeEach(async () => {
      const res = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
          method: "POST",
          token: ownerToken,
          body: { title: "Deploy to production" },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );
      taskId = (await res.json()).data.task.id;
    });

    it("automatically sets completedAt when status -> COMPLETED and clears when moved away", async () => {
      // 1. Move to COMPLETED
      const resCompleted = await updateTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          token: ownerToken,
          body: { status: "COMPLETED" },
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(resCompleted.status).toBe(200);
      const jsonCompleted = await resCompleted.json();
      expect(jsonCompleted.data.task.status).toBe("COMPLETED");
      expect(jsonCompleted.data.task.completedAt).not.toBeNull();

      // 2. Re-open to IN_PROGRESS
      const resReopen = await updateTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "PATCH",
          token: ownerToken,
          body: { status: "IN_PROGRESS" },
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(resReopen.status).toBe(200);
      const jsonReopen = await resReopen.json();
      expect(jsonReopen.data.task.status).toBe("IN_PROGRESS");
      expect(jsonReopen.data.task.completedAt).toBeNull();
    });
  });

  describe("Task Deletion", () => {
    let taskId: string;

    beforeEach(async () => {
      const res = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
          method: "POST",
          token: member1Token, // Carol (creator)
          body: { title: "Temporary scratch task", assigneeId: member2User.id },
        }),
        { params: { organizationId: orgId, projectId } } as any
      );
      taskId = (await res.json()).data.task.id;
    });

    it("assignee who is not creator/owner gets 403 on DELETE", async () => {
      const res = await deleteTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "DELETE",
          token: member2Token, // Dave is assignee, not creator
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(res.status).toBe(403);
    });

    it("creator can delete their task (200)", async () => {
      const res = await deleteTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
          method: "DELETE",
          token: member1Token, // Carol is creator
        }),
        { params: { organizationId: orgId, projectId, taskId } } as any
      );

      expect(res.status).toBe(200);
    });
  });
});
