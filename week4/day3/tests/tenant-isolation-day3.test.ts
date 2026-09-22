import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import { POST as createProjectHandler } from "@/app/api/organizations/[organizationId]/projects/route";
import {
  POST as addProjectMemberHandler,
  GET as getProjectMembersHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/members/route";
import { DELETE as removeProjectMemberHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/members/[userId]/route";
import {
  POST as createTaskHandler,
  GET as getTasksHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/route";
import { GET as getTaskDetailHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { UserDTO } from "@/types";

describe("Tenant Isolation, Cross-Project IDOR & Member Removal Retention", () => {
  let ownerToken: string;
  let memberToken: string;

  let ownerUser: UserDTO;
  let memberUser: UserDTO;

  let orgId: string;
  let project1Id: string;
  let project2Id: string;

  beforeEach(async () => {
    inMemoryPrisma.reset();

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

    const p1Res = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Project Alpha" },
      }),
      { params: { organizationId: orgId } } as any
    );
    project1Id = (await p1Res.json()).data.project.id;

    const p2Res = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Project Beta" },
      }),
      { params: { organizationId: orgId } } as any
    );
    project2Id = (await p2Res.json()).data.project.id;

    // Add Bob to Project 1
    await inMemoryPrisma.projectMember.create({
      data: { projectId: project1Id, userId: memberUser.id, addedById: ownerUser.id },
    });
  });

  describe("Cross-Project IDOR Prevention", () => {
    it("a valid taskId from Project A requested under Project B URL returns 404", async () => {
      // Create task in Project 1
      const taskRes = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks`, {
          method: "POST",
          token: ownerToken,
          body: { title: "Alpha Secret Task" },
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );
      const taskId = (await taskRes.json()).data.task.id;

      // Request taskId under Project 2's URL
      const idorRes = await getTaskDetailHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project2Id}/tasks/${taskId}`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project2Id, taskId } } as any
      );

      expect(idorRes.status).toBe(404);
      const json = await idorRes.json();
      expect(json.message).toContain("Task not found");
    });
  });

  describe("Member Removal & isAssigneeActive Retention", () => {
    it("removing a project member retains their task assignment with isAssigneeActive: false", async () => {
      // 1. Create a task assigned to Bob on Project 1
      const taskRes = await createTaskHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks`, {
          method: "POST",
          token: ownerToken,
          body: {
            title: "Task assigned to Bob",
            assigneeId: memberUser.id,
          },
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );
      const taskJson = await taskRes.json();
      const taskId = taskJson.data.task.id;
      expect(taskJson.data.task.isAssigneeActive).toBe(true);

      // 2. Remove Bob from Project 1
      const removeRes = await removeProjectMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/members/${memberUser.id}`, {
          method: "DELETE",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id, userId: memberUser.id } } as any
      );
      expect(removeRes.status).toBe(200);

      // 3. Fetch task details again: assignment should be preserved, but isAssigneeActive should be false!
      const detailRes = await getTaskDetailHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks/${taskId}`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id, taskId } } as any
      );

      expect(detailRes.status).toBe(200);
      const json = await detailRes.json();
      expect(json.data.task.assigneeId).toBe(memberUser.id);
      expect(json.data.task.isAssigneeActive).toBe(false);

      // 4. Fetch list of tasks: isAssigneeActive should also be false
      const listRes = await getTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${project1Id}/tasks`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: { organizationId: orgId, projectId: project1Id } } as any
      );
      const listJson = await listRes.json();
      const fetchedTask = listJson.data.tasks.find((t: any) => t.id === taskId);
      expect(fetchedTask.isAssigneeActive).toBe(false);
    });
  });
});
