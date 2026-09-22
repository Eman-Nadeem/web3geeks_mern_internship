import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import { POST as createProjectHandler } from "@/app/api/organizations/[organizationId]/projects/route";
import { POST as createTaskHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/route";
import {
  GET as getCommentsHandler,
  POST as createCommentHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/comments/route";
import {
  PATCH as updateCommentHandler,
  DELETE as deleteCommentHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/comments/[commentId]/route";
import { GET as getOrgActivityHandler } from "@/app/api/organizations/[organizationId]/activity/route";
import { GET as getProjectActivityHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/activity/route";
import {
  GET as getNotificationsHandler,
} from "@/app/api/notifications/route";
import {
  PATCH as markNotificationReadHandler,
} from "@/app/api/notifications/[notificationId]/route";
import {
  POST as markAllNotificationsReadHandler,
} from "@/app/api/notifications/read-all/route";
import { POST as presenceHeartbeatHandler } from "@/app/api/presence/heartbeat/route";
import { GET as getPresenceHandler } from "@/app/api/presence/[organizationId]/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { UserDTO } from "@/types";

describe("Day 4 Features: Comments, Activity, Notifications & Presence", () => {
  let ownerToken: string;
  let memberToken: string;
  let ownerUser: UserDTO;
  let memberUser: UserDTO;
  let orgId: string;
  let projectId: string;
  let taskId: string;

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

    // 2. Register Member
    const memberRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Bob Member", email: "bob@example.com", password: "Password123!" },
      }),
      {} as any
    );
    memberToken = memberRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    memberUser = (await memberRes.json()).data.user;

    // 3. Create Org
    const orgRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: ownerToken,
        body: { name: "Acme Corp", slug: "acme-corp" },
      }),
      {} as any
    );
    orgId = (await orgRes.json()).data.organization.id;

    // Add Bob to org as MEMBER directly in mock
    inMemoryPrisma.memberships.set(`${memberUser.id}_${orgId}`, {
      id: crypto.randomUUID(),
      userId: memberUser.id,
      organizationId: orgId,
      role: "MEMBER",
      joinedAt: new Date(),
    });

    // 4. Create Project
    const projRes = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Alpha Project" },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    projectId = (await projRes.json()).data.project.id;

    // 5. Create Task
    const taskRes = await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: { title: "Implement Auth Flow" },
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId }) } as any
    );
    taskId = (await taskRes.json()).data.task.id;
  });

  describe("Task Comments", () => {
    it("should allow creating a comment on a task", async () => {
      const res = await createCommentHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
          {
            method: "POST",
            token: ownerToken,
            body: { body: "This is a great task!" },
          }
        ),
        { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.comment.body).toBe("This is a great task!");
      expect(json.data.comment.author.id).toBe(ownerUser.id);
    });

    it("should reject empty comment body with 400", async () => {
      const res = await createCommentHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
          {
            method: "POST",
            token: ownerToken,
            body: { body: "" },
          }
        ),
        { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
      );

      expect(res.status).toBe(400);
    });

    it("should list comments for a task", async () => {
      // Create a comment first
      await createCommentHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
          {
            method: "POST",
            token: ownerToken,
            body: { body: "Comment 1" },
          }
        ),
        { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
      );

      const res = await getCommentsHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
          {
            method: "GET",
            token: ownerToken,
          }
        ),
        { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.comments.length).toBeGreaterThanOrEqual(1);
    });

    it("should allow author to update their comment", async () => {
      // Create comment
      const createRes = await createCommentHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`,
          {
            method: "POST",
            token: ownerToken,
            body: { body: "Original body" },
          }
        ),
        { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
      );
      const commentId = (await createRes.json()).data.comment.id;

      // Update comment
      const updateRes = await updateCommentHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
          {
            method: "PATCH",
            token: ownerToken,
            body: { body: "Updated body" },
          }
        ),
        { params: Promise.resolve({ organizationId: orgId, projectId, taskId, commentId }) } as any
      );

      expect(updateRes.status).toBe(200);
      const json = await updateRes.json();
      expect(json.data.comment.body).toBe("Updated body");
    });
  });

  describe("Notifications", () => {
    it("should return notifications list for the authenticated user", async () => {
      const res = await getNotificationsHandler(
        createRequest("http://localhost:3000/api/notifications", {
          method: "GET",
          token: ownerToken,
        }),
        {} as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data.notifications)).toBe(true);
      expect(typeof json.data.unreadCount).toBe("number");
    });

    it("should allow marking all notifications as read", async () => {
      const res = await markAllNotificationsReadHandler(
        createRequest("http://localhost:3000/api/notifications/read-all", {
          method: "POST",
          token: ownerToken,
        }),
        {} as any
      );

      expect(res.status).toBe(200);
    });
  });

  describe("Activity Log", () => {
    it("should fetch project activity for project member", async () => {
      const res = await getProjectActivityHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/activity`,
          {
            method: "GET",
            token: ownerToken,
          }
        ),
        { params: Promise.resolve({ organizationId: orgId, projectId }) } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data.activities)).toBe(true);
    });

    it("should reject regular member from viewing org-wide activity with 403", async () => {
      const res = await getOrgActivityHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/activity`, {
          method: "GET",
          token: memberToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );

      expect(res.status).toBe(403);
    });

    it("should allow owner to view org-wide activity", async () => {
      const res = await getOrgActivityHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/activity`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data.activities)).toBe(true);
    });
  });

  describe("Presence", () => {
    it("should record a presence heartbeat for authenticated user", async () => {
      const res = await presenceHeartbeatHandler(
        createRequest("http://localhost:3000/api/presence/heartbeat", {
          method: "POST",
          token: ownerToken,
        }),
        {} as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.userId).toBe(ownerUser.id);
    });

    it("should get presence for organization members", async () => {
      const res = await getPresenceHandler(
        createRequest(`http://localhost:3000/api/presence/${orgId}`, {
          method: "GET",
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.data.presence)).toBe(true);
    });
  });
});
