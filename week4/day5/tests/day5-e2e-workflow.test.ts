import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import { POST as createInvitationHandler } from "@/app/api/organizations/[organizationId]/invitations/route";
import { GET as getInvitationByTokenHandler } from "@/app/api/invitations/[token]/route";
import { POST as acceptInvitationHandler } from "@/app/api/invitations/[token]/accept/route";
import { POST as createProjectHandler } from "@/app/api/organizations/[organizationId]/projects/route";
import { GET as getProjectDetailHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/route";
import { POST as addProjectMemberHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/members/route";
import { POST as createTaskHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/route";
import { PATCH as updateTaskHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/route";
import { POST as createCommentHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/comments/route";
import { GET as getOrgActivityHandler } from "@/app/api/organizations/[organizationId]/activity/route";
import { GET as getProjectActivityHandler } from "@/app/api/organizations/[organizationId]/projects/[projectId]/activity/route";
import { GET as getNotificationsHandler } from "@/app/api/notifications/route";
import { POST as markAllNotificationsReadHandler } from "@/app/api/notifications/read-all/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import * as pusherModule from "@/server/lib/pusher";

describe("Day 5 Master End-to-End User Journey Workflow Test", () => {
  beforeEach(() => {
    inMemoryPrisma.reset();
    vi.restoreAllMocks();
  });

  it("walks the complete 15-step multi-tenant lifecycle from registration to real-time events", async () => {
    // Spy on Pusher triggerEvent for Step 15 assertion
    const triggerSpy = vi.spyOn(pusherModule, "triggerEvent");

    // ─────────────────────────────────────────────────────────────────────────
    // Step 1: Register User A (owner-to-be)
    // ─────────────────────────────────────────────────────────────────────────
    const regResA = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          name: "Alice Owner",
          email: "alice.e2e@example.com",
          password: "Password123!",
        },
      }),
      {} as any
    );
    expect(regResA.status).toBe(201);
    const regDataA = await regResA.json();
    expect(regDataA.success).toBe(true);
    const userA = regDataA.data.user;
    expect(userA.email).toBe("alice.e2e@example.com");

    // ─────────────────────────────────────────────────────────────────────────
    // Step 2: Login User A
    // ─────────────────────────────────────────────────────────────────────────
    const loginResA = await loginHandler(
      createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: {
          email: "alice.e2e@example.com",
          password: "Password123!",
        },
      }),
      {} as any
    );
    expect(loginResA.status).toBe(200);
    const tokenA = loginResA.cookies.get(AUTH_COOKIE_NAME)?.value;
    expect(tokenA).toBeDefined();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 3: Create Organization
    // ─────────────────────────────────────────────────────────────────────────
    const orgRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: tokenA,
        body: {
          name: "Acme Enterprises",
          slug: "acme-enterprises",
        },
      }),
      {} as any
    );
    expect(orgRes.status).toBe(201);
    const orgData = await orgRes.json();
    expect(orgData.success).toBe(true);
    const orgId = orgData.data.organization.id;
    expect(orgData.data.organization.role).toBe("OWNER");

    // ─────────────────────────────────────────────────────────────────────────
    // Step 4: Register User B separately (so they exist to be invited)
    // ─────────────────────────────────────────────────────────────────────────
    const regResB = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          name: "Bob Collaborator",
          email: "bob.e2e@example.com",
          password: "Password123!",
        },
      }),
      {} as any
    );
    expect(regResB.status).toBe(201);
    const tokenB = regResB.cookies.get(AUTH_COOKIE_NAME)?.value;
    const userB = (await regResB.json()).data.user;
    expect(tokenB).toBeDefined();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 5: User A invites User B by email, role=MEMBER
    // ─────────────────────────────────────────────────────────────────────────
    const inviteRes = await createInvitationHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
        method: "POST",
        token: tokenA,
        body: {
          email: "bob.e2e@example.com",
          role: "MEMBER",
        },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(inviteRes.status).toBe(201);
    const inviteData = await inviteRes.json();
    expect(inviteData.success).toBe(true);
    const rawInviteToken = inviteData.data.rawToken;
    expect(rawInviteToken).toBeDefined();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 6: Fetch the invitation by token, accept as User B (logged in)
    // ─────────────────────────────────────────────────────────────────────────
    const fetchInviteRes = await getInvitationByTokenHandler(
      createRequest(`http://localhost:3000/api/invitations/${rawInviteToken}`, {
        method: "GET",
      }),
      { params: Promise.resolve({ token: rawInviteToken }) } as any
    );
    expect(fetchInviteRes.status).toBe(200);

    const acceptRes = await acceptInvitationHandler(
      createRequest(`http://localhost:3000/api/invitations/${rawInviteToken}/accept`, {
        method: "POST",
        token: tokenB,
      }),
      { params: Promise.resolve({ token: rawInviteToken }) } as any
    );
    expect(acceptRes.status).toBe(200);

    // Assert Membership(User B, MEMBER) now exists in the database
    const membershipB = await inMemoryPrisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: userB.id,
          organizationId: orgId,
        },
      },
    });
    expect(membershipB).not.toBeNull();
    expect(membershipB?.role).toBe("MEMBER");

    // ─────────────────────────────────────────────────────────────────────────
    // Step 7: User A creates a Project
    // ─────────────────────────────────────────────────────────────────────────
    const projectRes = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects`, {
        method: "POST",
        token: tokenA,
        body: {
          name: "Project Titan",
          description: "Mission-critical initiative",
        },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(projectRes.status).toBe(201);
    const projectId = (await projectRes.json()).data.project.id;
    expect(projectId).toBeDefined();

    // ─────────────────────────────────────────────────────────────────────────
    // Step 8: User A adds User B as a Project Member (with 403 test prior)
    // ─────────────────────────────────────────────────────────────────────────
    // Before adding: User B accessing the project directly should yield 403 Forbidden
    const unauthProjectRes = await getProjectDetailHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}`, {
        method: "GET",
        token: tokenB,
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId }) } as any
    );
    expect(unauthProjectRes.status).toBe(403);

    // User A adds User B as Project Member
    const addMemberRes = await addProjectMemberHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/members`, {
        method: "POST",
        token: tokenA,
        body: {
          userId: userB.id,
        },
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId }) } as any
    );
    expect(addMemberRes.status).toBe(201);

    // After adding: User B can now GET the project successfully
    const authProjectRes = await getProjectDetailHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}`, {
        method: "GET",
        token: tokenB,
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId }) } as any
    );
    expect(authProjectRes.status).toBe(200);
    const projectDetail = (await authProjectRes.json()).data.project;
    expect(projectDetail.name).toBe("Project Titan");

    // ─────────────────────────────────────────────────────────────────────────
    // Step 9: User A creates a Task, assigns to User B
    // ─────────────────────────────────────────────────────────────────────────
    const taskRes = await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks`, {
        method: "POST",
        token: tokenA,
        body: {
          title: "Implement Telemetry Engine",
          description: "Build robust streaming engine",
          status: "TODO",
          priority: "HIGH",
          assigneeId: userB.id,
        },
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId }) } as any
    );
    expect(taskRes.status).toBe(201);
    const taskId = (await taskRes.json()).data.task.id;
    expect(taskId).toBeDefined();

    // Assert a Notification was created for User B
    const notifsB = await inMemoryPrisma.notification.findMany({
      where: { userId: userB.id, type: "TASK_ASSIGNED" },
    });
    expect(notifsB.length).toBeGreaterThan(0);
    expect(notifsB[0].title).toContain("assigned");

    // Assert Activity rows (TASK_CREATED, TASK_ASSIGNED) exist
    const activitiesAfterCreate = await inMemoryPrisma.activity.findMany({
      where: { taskId },
    });
    const activityTypes = activitiesAfterCreate.map((a: any) => a.type);
    expect(activityTypes).toContain("TASK_CREATED");
    expect(activityTypes).toContain("TASK_ASSIGNED");

    // ─────────────────────────────────────────────────────────────────────────
    // Step 10: User B updates Task status to IN_PROGRESS
    // ─────────────────────────────────────────────────────────────────────────
    const updateTaskRes = await updateTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        token: tokenB,
        body: {
          status: "IN_PROGRESS",
        },
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
    );
    expect(updateTaskRes.status).toBe(200);
    const updatedTask = (await updateTaskRes.json()).data.task;
    expect(updatedTask.status).toBe("IN_PROGRESS");
    expect(updatedTask.completedAt).toBeNull(); // Assert completedAt is still null

    // Assert Activity row (TASK_STATUS_CHANGED) exists with correct metadata
    const statusActivities = await inMemoryPrisma.activity.findMany({
      where: { taskId, type: "TASK_STATUS_CHANGED" },
    });
    expect(statusActivities.length).toBeGreaterThan(0);
    expect(statusActivities[0].meta.newStatus).toBe("IN_PROGRESS");

    // ─────────────────────────────────────────────────────────────────────────
    // Step 11: User B adds a Comment on the Task
    // ─────────────────────────────────────────────────────────────────────────
    const commentRes = await createCommentHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`, {
        method: "POST",
        token: tokenB,
        body: {
          body: "Initial telemetry architecture draft is ready for review.",
        },
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
    );
    expect(commentRes.status).toBe(201);

    // Assert Activity row (TASK_COMMENT_ADDED)
    const commentActivities = await inMemoryPrisma.activity.findMany({
      where: { taskId, type: "TASK_COMMENT_ADDED" },
    });
    expect(commentActivities.length).toBeGreaterThan(0);

    // Assert User A received a Notification (as task creator), User B did not
    const notifsUserA = await inMemoryPrisma.notification.findMany({
      where: { userId: userA.id, type: "TASK_COMMENT" },
    });
    expect(notifsUserA.length).toBe(1);

    const commentNotifsUserB = await inMemoryPrisma.notification.findMany({
      where: { userId: userB.id, type: "TASK_COMMENT" },
    });
    expect(commentNotifsUserB.length).toBe(0);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 12: User A marks the Task COMPLETED
    // ─────────────────────────────────────────────────────────────────────────
    const completeRes = await updateTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        token: tokenA,
        body: {
          status: "COMPLETED",
        },
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId, taskId }) } as any
    );
    expect(completeRes.status).toBe(200);
    const completedTask = (await completeRes.json()).data.task;
    expect(completedTask.status).toBe("COMPLETED");
    expect(completedTask.completedAt).not.toBeNull(); // Assert completedAt is now set

    // ─────────────────────────────────────────────────────────────────────────
    // Step 13: User A views Activity feed (org-wide and project-scoped)
    // ─────────────────────────────────────────────────────────────────────────
    const orgActivityRes = await getOrgActivityHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/activity`, {
        method: "GET",
        token: tokenA,
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(orgActivityRes.status).toBe(200);
    const orgActivityData = await orgActivityRes.json();
    expect(orgActivityData.data.activities.length).toBeGreaterThanOrEqual(4);

    const projActivityRes = await getProjectActivityHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}/projects/${projectId}/activity`, {
        method: "GET",
        token: tokenA,
      }),
      { params: Promise.resolve({ organizationId: orgId, projectId }) } as any
    );
    expect(projActivityRes.status).toBe(200);
    const projActivityData = await projActivityRes.json();
    expect(projActivityData.data.activities.length).toBeGreaterThanOrEqual(4);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 14: User A views Notifications, unread count matches, marks all read
    // ─────────────────────────────────────────────────────────────────────────
    const notifResA = await getNotificationsHandler(
      createRequest("http://localhost:3000/api/notifications", {
        method: "GET",
        token: tokenA,
      }),
      {} as any
    );
    expect(notifResA.status).toBe(200);
    const notifDataA = await notifResA.json();
    expect(notifDataA.data.unreadCount).toBeGreaterThan(0);

    // Mark all as read
    const markAllRes = await markAllNotificationsReadHandler(
      createRequest("http://localhost:3000/api/notifications/read-all", {
        method: "POST",
        token: tokenA,
      }),
      {} as any
    );
    expect(markAllRes.status).toBe(200);

    const recheckNotifs = await getNotificationsHandler(
      createRequest("http://localhost:3000/api/notifications", {
        method: "GET",
        token: tokenA,
      }),
      {} as any
    );
    expect((await recheckNotifs.json()).data.unreadCount).toBe(0);

    // ─────────────────────────────────────────────────────────────────────────
    // Step 15: Pusher helper assertions across all operations
    // ─────────────────────────────────────────────────────────────────────────
    // Assert triggerEvent was invoked with project and user private channels
    const channelsCalled = triggerSpy.mock.calls.map((c) => c[0]);
    const eventsCalled = triggerSpy.mock.calls.map((c) => c[1]);

    expect(channelsCalled).toContain(`private-project-${projectId}`);
    expect(channelsCalled).toContain(`private-user-${userB.id}`);
    expect(channelsCalled).toContain(`private-user-${userA.id}`);

    expect(eventsCalled).toContain("task:created");
    expect(eventsCalled).toContain("task:updated");
    expect(eventsCalled).toContain("task:comment.created");
    expect(eventsCalled).toContain("user:notification");
  });
});
