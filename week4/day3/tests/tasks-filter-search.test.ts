import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import { POST as createProjectHandler } from "@/app/api/organizations/[organizationId]/projects/route";
import {
  POST as createTaskHandler,
  GET as getTasksHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/route";
import { GET as getMyTasksHandler } from "@/app/api/organizations/[organizationId]/tasks/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { UserDTO } from "@/types";

describe("Tasks Filter, Search, Pagination & Cross-Project My Tasks", () => {
  let ownerToken: string;
  let member1Token: string;
  let member2Token: string;

  let ownerUser: UserDTO;
  let member1User: UserDTO;
  let member2User: UserDTO;

  let orgId: string;
  let project1Id: string;
  let project2Id: string;

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

    // 2. Org & Memberships
    const orgRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: ownerToken,
        body: { name: "Acme Corp", slug: "acme-corp" },
      }),
      {} as any
    );
    orgId = (await orgRes.json()).data.organization.id;

    await inMemoryPrisma.membership.create({
      data: { userId: member1User.id, organizationId: orgId, role: "MEMBER" },
    });
    await inMemoryPrisma.membership.create({
      data: { userId: member2User.id, organizationId: orgId, role: "MEMBER" },
    });

    // 3. Projects: Project 1 (Carol is on it), Project 2 (Carol is NOT on it)
    const p1Res = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Frontend App" },
      }),
      { params: { organizationId: orgId } } as any
    );
    project1Id = (await p1Res.json()).data.project.id;

    const p2Res = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Backend Infrastructure" },
      }),
      { params: { organizationId: orgId } } as any
    );
    project2Id = (await p2Res.json()).data.project.id;

    // Carol is on Project 1 only
    await inMemoryPrisma.projectMember.create({
      data: { projectId: project1Id, userId: member1User.id, addedById: ownerUser.id },
    });

    // Dave is on Project 1 and Project 2
    await inMemoryPrisma.projectMember.create({
      data: { projectId: project1Id, userId: member2User.id, addedById: ownerUser.id },
    });
    await inMemoryPrisma.projectMember.create({
      data: { projectId: project2Id, userId: member2User.id, addedById: ownerUser.id },
    });

    // Seed tasks in Project 1
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

    // Task 1: Overdue, high priority, assigned to Carol
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: {
          title: "Fix authentication bug",
          description: "Login token expiry issue",
          status: "TODO",
          priority: "HIGH",
          assigneeId: member1User.id,
          dueDate: pastDate,
        },
      }),
      { params: { organizationId: orgId, projectId: project1Id } } as any
    );

    // Task 2: Completed, low priority, assigned to Carol
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: {
          title: "Update styles",
          description: "Button colors",
          status: "COMPLETED",
          priority: "LOW",
          assigneeId: member1User.id,
          dueDate: pastDate,
        },
      }),
      { params: { organizationId: orgId, projectId: project1Id } } as any
    );

    // Task 3: In Progress, medium priority, assigned to Dave
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: {
          title: "Setup Vitest CI pipeline",
          description: "Automate test runner",
          status: "IN_PROGRESS",
          priority: "MEDIUM",
          assigneeId: member2User.id,
          dueDate: futureDate,
        },
      }),
      { params: { organizationId: orgId, projectId: project1Id } } as any
    );

    // Task 4: In Project 2, assigned to Dave
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project2Id}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: {
          title: "Database index tuning",
          description: "Speed up lookups",
          status: "TODO",
          priority: "URGENT",
          assigneeId: member2User.id,
        },
      }),
      { params: { organizationId: orgId, projectId: project2Id } } as any
    );
  });

  describe("Project Tasks Filtering & Search", () => {
    it("filters by status correctly", async () => {
      const res = await getTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks?status=COMPLETED`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );

      const json = await res.json();
      expect(json.data.tasks.length).toBe(1);
      expect(json.data.tasks[0].title).toBe("Update styles");
    });

    it("filters by priority correctly", async () => {
      const res = await getTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks?priority=HIGH`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );

      const json = await res.json();
      expect(json.data.tasks.length).toBe(1);
      expect(json.data.tasks[0].title).toBe("Fix authentication bug");
    });

    it("filters overdue tasks (dueDate < now AND status != COMPLETED)", async () => {
      const res = await getTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks?overdue=true`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );

      const json = await res.json();
      // Should return Task 1 (TODO), but NOT Task 2 (COMPLETED) even though Task 2's dueDate is in past
      expect(json.data.tasks.length).toBe(1);
      expect(json.data.tasks[0].title).toBe("Fix authentication bug");
    });

    it("searches text in title and description", async () => {
      const res = await getTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks?search=pipeline`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );

      const json = await res.json();
      expect(json.data.tasks.length).toBe(1);
      expect(json.data.tasks[0].title).toBe("Setup Vitest CI pipeline");
    });

    it("enforces pagination bounds (limit clamped to 100)", async () => {
      const res = await getTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks?limit=150`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );

      // Zod schema with max(100) rejects or clamps (400 if strictly validated)
      // Since max(100) is on Zod, it returns 400 validation error
      expect(res.status).toBe(400);
    });
  });

  describe("Cross-Project My Tasks Endpoint", () => {
    it("defaults to assigneeId=me and returns tasks across projects accessible by user", async () => {
      // Dave is assigned 1 task in Project 1 and 1 task in Project 2
      const res = await getMyTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/tasks`, {
          method: "GET",
          token: member2Token, // Dave
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.tasks.length).toBe(2);
      expect(json.data.tasks.every((t: any) => t.assigneeId === member2User.id)).toBe(true);
    });

    it("Carol sees only her tasks from Project 1 and cannot see Project 2 tasks", async () => {
      const res = await getMyTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/tasks`, {
          method: "GET",
          token: member1Token, // Carol
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.tasks.length).toBe(2); // Carol's 2 tasks in Project 1
      expect(json.data.tasks.every((t: any) => t.projectId === project1Id)).toBe(true);
    });

    it("non-admin member attempting to filter by a project they do not belong to gets 403", async () => {
      const res = await getMyTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/tasks?projectId=${project2Id}`, {
          method: "GET",
          token: member1Token, // Carol (not on Project 2)
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(403);
    });

    it("org OWNER can query tasks across all projects in the organization", async () => {
      const res = await getMyTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/tasks?assigneeId=${member2User.id}`, {
          method: "GET",
          token: ownerToken, // Alice
        }),
        { params: { organizationId: orgId } } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.tasks.length).toBe(2); // Both of Dave's tasks
    });
  });
});
