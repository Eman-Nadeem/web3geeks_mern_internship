import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import { POST as createProjectHandler } from "@/app/api/organizations/[organizationId]/projects/route";
import { POST as createTaskHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/route";
import { GET as getDashboardHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/dashboard/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { UserDTO } from "@/types";

describe("Project Dashboard Live Metrics & Overdue Calculation", () => {
  let ownerToken: string;
  let memberToken: string;

  let ownerUser: UserDTO;
  let memberUser: UserDTO;

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

    const mRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Bob Member", email: "bob@example.com", password: "Password123!" },
      }),
      {} as any
    );
    memberToken = mRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    memberUser = (await mRes.json()).data.user;

    // 2. Org & Project
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
      data: { userId: memberUser.id, organizationId: orgId, role: "MEMBER" },
    });

    const projRes = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Dashboard Test Project" },
      }),
      { params: { organizationId: orgId } } as any
    );
    projectId = (await projRes.json()).data.project.id;

    await inMemoryPrisma.projectMember.create({
      data: { projectId, userId: memberUser.id, addedById: ownerUser.id },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes accurate aggregate counts, completion %, and workload distribution", async () => {
    // Create 4 tasks:
    // 1. TODO, assigned to Alice
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: { title: "Task 1", status: "TODO", assigneeId: ownerUser.id },
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    // 2. IN_PROGRESS, assigned to Bob
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: { title: "Task 2", status: "IN_PROGRESS", assigneeId: memberUser.id },
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    // 3. COMPLETED, assigned to Bob
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: { title: "Task 3", status: "COMPLETED", assigneeId: memberUser.id },
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    // 4. REVIEW, unassigned
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: { title: "Task 4", status: "REVIEW" },
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    const res = await getDashboardHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/dashboard`, {
        method: "GET",
        token: ownerToken,
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const d = json.data.dashboard;

    expect(d.totalTasks).toBe(4);
    expect(d.tasksByStatus).toEqual({
      todo: 1,
      inProgress: 1,
      review: 1,
      completed: 1,
    });
    // 1 completed / 4 total = 25%
    expect(d.completionPercentage).toBe(25);

    // Member workloads: Bob has 2 assigned, Alice has 1 assigned
    const aliceWorkload = d.members.find((m: any) => m.id === ownerUser.id);
    const bobWorkload = d.members.find((m: any) => m.id === memberUser.id);
    expect(aliceWorkload.assignedTaskCount).toBe(1);
    expect(bobWorkload.assignedTaskCount).toBe(2);
  });

  it("calculates overdue tasks accurately using a mocked server clock", async () => {
    // Freeze time at 2026-06-15T12:00:00Z
    const fixedTime = new Date("2026-06-15T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(fixedTime);

    // Task due 2 days before (overdue, TODO)
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: {
          title: "Overdue incomplete task",
          status: "TODO",
          dueDate: "2026-06-13T12:00:00.000Z",
        },
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    // Task due 1 day before but COMPLETED (should NOT count as overdue)
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: {
          title: "Past completed task",
          status: "COMPLETED",
          dueDate: "2026-06-14T12:00:00.000Z",
        },
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    // Task due in future (not overdue)
    await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: {
          title: "Future task",
          status: "TODO",
          dueDate: "2026-06-20T12:00:00.000Z",
        },
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    const res = await getDashboardHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/dashboard`, {
        method: "GET",
        token: ownerToken,
      }),
      { params: { organizationId: orgId, projectId } } as any
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    const d = json.data.dashboard;

    expect(d.overdueTasks.count).toBe(1);
    expect(d.overdueTasks.tasks[0].title).toBe("Overdue incomplete task");
  });
});
