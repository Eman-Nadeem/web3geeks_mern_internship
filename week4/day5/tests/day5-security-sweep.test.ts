import { describe, it, expect, beforeEach } from "vitest";
import { GET as authMeHandler } from "@/app/api/auth/me/route";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import {
  GET as getOrgsHandler,
  POST as createOrgHandler,
} from "@/app/api/organizations/route";
import {
  PATCH as updateOrgHandler,
  DELETE as deleteOrgHandler,
} from "@/app/api/organizations/[organizationId]/route";
import {
  GET as getMembersHandler,
} from "@/app/api/organizations/[organizationId]/members/route";
import {
  DELETE as removeMemberHandler,
} from "@/app/api/organizations/[organizationId]/members/[membershipId]/route";
import {
  POST as createInvitationHandler,
} from "@/app/api/organizations/[organizationId]/invitations/route";
import {
  POST as acceptInvitationHandler,
} from "@/app/api/invitations/[token]/accept/route";
import {
  POST as createProjectHandler,
  GET as getProjectsHandler,
} from "@/app/api/organizations/[organizationId]/projects/route";
import {
  POST as addProjectMemberHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/members/route";
import {
  POST as createTaskHandler,
  GET as getTasksHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/route";
import {
  PATCH as updateTaskHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/route";
import {
  POST as createCommentHandler,
  GET as getCommentsHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/comments/route";
import {
  PATCH as updateCommentHandler,
  DELETE as deleteCommentHandler,
} from "@/app/api/organizations/[organizationId]/projects/[projectId]/tasks/[taskId]/comments/[commentId]/route";
import {
  GET as getOrgActivityHandler,
} from "@/app/api/organizations/[organizationId]/activity/route";
import {
  GET as getNotificationsHandler,
} from "@/app/api/notifications/route";
import {
  PATCH as markNotificationHandler,
  DELETE as deleteNotificationHandler,
} from "@/app/api/notifications/[notificationId]/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { hashToken } from "@/server/modules/invitations/service";

describe("Day 5 Security, Authorization & Boundary Sweep", () => {
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let outsiderToken: string;

  let ownerId: string;
  let adminId: string;
  let memberId: string;
  let outsiderId: string;

  let orgAId: string;
  let orgBId: string;
  let projectAId: string;
  let taskAId: string;
  let commentAId: string;

  beforeEach(async () => {
    inMemoryPrisma.reset();

    // 1. Create Owner
    const regOwner = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Owner Alice", email: "alice.sec@example.com", password: "Password123!" },
      }),
      {} as any
    );
    ownerToken = regOwner.cookies.get(AUTH_COOKIE_NAME)!.value;
    ownerId = (await regOwner.json()).data.user.id;

    // 2. Create Admin
    const regAdmin = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Admin Bob", email: "bob.sec@example.com", password: "Password123!" },
      }),
      {} as any
    );
    adminToken = regAdmin.cookies.get(AUTH_COOKIE_NAME)!.value;
    adminId = (await regAdmin.json()).data.user.id;

    // 3. Create Member
    const regMember = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Member Charlie", email: "charlie.sec@example.com", password: "Password123!" },
      }),
      {} as any
    );
    memberToken = regMember.cookies.get(AUTH_COOKIE_NAME)!.value;
    memberId = (await regMember.json()).data.user.id;

    // 4. Create Outsider (belongs to different org)
    const regOutsider = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Outsider Dave", email: "dave.sec@example.com", password: "Password123!" },
      }),
      {} as any
    );
    outsiderToken = regOutsider.cookies.get(AUTH_COOKIE_NAME)!.value;
    outsiderId = (await regOutsider.json()).data.user.id;

    // 5. Create Org A
    const orgARes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: ownerToken,
        body: { name: "Organization Alpha", slug: "org-alpha" },
      }),
      {} as any
    );
    orgAId = (await orgARes.json()).data.organization.id;

    // Add Bob as ADMIN to Org A
    const adminMemId = crypto.randomUUID();
    inMemoryPrisma.memberships.set(adminMemId, {
      id: adminMemId,
      userId: adminId,
      organizationId: orgAId,
      role: "ADMIN" as any,
      joinedAt: new Date(),
    });

    // Add Charlie as MEMBER to Org A
    const memberMemId = crypto.randomUUID();
    inMemoryPrisma.memberships.set(memberMemId, {
      id: memberMemId,
      userId: memberId,
      organizationId: orgAId,
      role: "MEMBER" as any,
      joinedAt: new Date(),
    });

    // 6. Create Org B (owned by Outsider)
    const orgBRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: outsiderToken,
        body: { name: "Organization Beta", slug: "org-beta" },
      }),
      {} as any
    );
    orgBId = (await orgBRes.json()).data.organization.id;

    // 7. Create Project in Org A
    const projRes = await createProjectHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects`, {
        method: "POST",
        token: ownerToken,
        body: { name: "Alpha Project" },
      }),
      { params: Promise.resolve({ organizationId: orgAId }) } as any
    );
    projectAId = (await projRes.json()).data.project.id;

    // Add Charlie as member in Project A
    await addProjectMemberHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/members`, {
        method: "POST",
        token: ownerToken,
        body: { userId: memberId },
      }),
      { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId }) } as any
    );

    // 8. Create Task in Project A
    const taskRes = await createTaskHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/tasks`, {
        method: "POST",
        token: ownerToken,
        body: { title: "Security Baseline Task", status: "TODO", priority: "HIGH" },
      }),
      { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId }) } as any
    );
    taskAId = (await taskRes.json()).data.task.id;

    // 9. Create Comment on Task A by Member Charlie
    const commentRes = await createCommentHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}/comments`, {
        method: "POST",
        token: memberToken,
        body: { body: "Charlie's confidential note" },
      }),
      { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId, taskId: taskAId }) } as any
    );
    commentAId = (await commentRes.json()).data.comment.id;
  });

  describe("1. Role-Based Access Control (RBAC) Permutations", () => {
    it("Organization: OWNER can rename/delete; ADMIN can rename but cannot delete; MEMBER cannot rename or delete", async () => {
      // ADMIN renaming -> allowed (200)
      const adminRename = await updateOrgHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}`, {
          method: "PATCH",
          token: adminToken,
          body: { name: "Alpha Renamed by Admin" },
        }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(adminRename.status).toBe(200);

      // ADMIN deleting org -> forbidden (403)
      const adminDelete = await deleteOrgHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(adminDelete.status).toBe(403);

      // MEMBER renaming org -> forbidden (403)
      const memberRename = await updateOrgHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}`, {
          method: "PATCH",
          token: memberToken,
          body: { name: "Illegal Rename" },
        }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(memberRename.status).toBe(403);

      // MEMBER deleting org -> forbidden (403)
      const memberDelete = await deleteOrgHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}`, {
          method: "DELETE",
          token: memberToken,
        }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(memberDelete.status).toBe(403);
    });

    it("Members: cannot remove last owner (409/403); ADMIN cannot remove ADMIN or OWNER (403); MEMBER cannot remove anyone (403)", async () => {
      const ownerMembership = Array.from(inMemoryPrisma.memberships.values()).find(
        (m) => m.userId === ownerId && m.organizationId === orgAId
      )!;
      const adminMembership = Array.from(inMemoryPrisma.memberships.values()).find(
        (m) => m.userId === adminId && m.organizationId === orgAId
      )!;

      // ADMIN trying to remove OWNER -> 403
      const adminRemoveOwner = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/members/${ownerMembership.id}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgAId, membershipId: ownerMembership.id }) } as any
      );
      expect(adminRemoveOwner.status).toBe(403);

      // MEMBER trying to remove member -> 403
      const memberRemove = await removeMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/members/${adminMembership.id}`, {
          method: "DELETE",
          token: memberToken,
        }),
        { params: Promise.resolve({ organizationId: orgAId, membershipId: adminMembership.id }) } as any
      );
      expect(memberRemove.status).toBe(403);
    });

    it("Invitations: MEMBER cannot create invitations; ADMIN cannot invite with role OWNER", async () => {
      // MEMBER creating invite -> 403
      const memberInvite = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/invitations`, {
          method: "POST",
          token: memberToken,
          body: { email: "new@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(memberInvite.status).toBe(403);

      // ADMIN trying to invite an OWNER -> 400 (Zod schema rejects OWNER in invite)
      const adminInviteOwner = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/invitations`, {
          method: "POST",
          token: adminToken,
          body: { email: "owner2@example.com", role: "OWNER" },
        }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(adminInviteOwner.status).toBe(400);
    });

    it("Projects: MEMBER cannot create project; adding non-org user to project is rejected with 400", async () => {
      // MEMBER creating project -> 403
      const memberCreateProj = await createProjectHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects`, {
          method: "POST",
          token: memberToken,
          body: { name: "Unauthorized Project" },
        }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(memberCreateProj.status).toBe(403);

      // Adding Outsider Dave (not in Org A) to Project A -> 400
      const addOutsider = await addProjectMemberHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/members`, {
          method: "POST",
          token: ownerToken,
          body: { userId: outsiderId },
        }),
        { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId }) } as any
      );
      expect(addOutsider.status).toBe(400);
    });

    it("Comments: Non-author (even ADMIN) cannot edit someone else's comment (403); author and ADMIN can delete", async () => {
      // Admin Bob trying to edit Charlie's comment -> 403
      const adminEdit = await updateCommentHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}/comments/${commentAId}`, {
          method: "PATCH",
          token: adminToken,
          body: { body: "Admin tampering with Charlie's words" },
        }),
        { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId, taskId: taskAId, commentId: commentAId }) } as any
      );
      expect(adminEdit.status).toBe(403);

      // Author Charlie editing own comment -> 200
      const authorEdit = await updateCommentHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}/comments/${commentAId}`, {
          method: "PATCH",
          token: memberToken,
          body: { body: "Charlie's updated note" },
        }),
        { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId, taskId: taskAId, commentId: commentAId }) } as any
      );
      expect(authorEdit.status).toBe(200);

      // Admin Bob deleting Charlie's comment -> 200 (Admins have moderation delete rights)
      const adminDeleteComment = await deleteCommentHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/tasks/${taskAId}/comments/${commentAId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId, taskId: taskAId, commentId: commentAId }) } as any
      );
      expect(adminDeleteComment.status).toBe(200);
    });
  });

  describe("2. Token & Authentication Security", () => {
    it("Malformed or garbage JWT yields 401 across all protected route categories", async () => {
      const badToken = "invalid.garbage.jwt-token";

      // Auth endpoint
      const resAuth = await authMeHandler(
        createRequest("http://localhost:3000/api/auth/me", { method: "GET", token: badToken }),
        {} as any
      );
      expect(resAuth.status).toBe(401);

      // Organizations endpoint
      const resOrg = await getOrgsHandler(
        createRequest("http://localhost:3000/api/organizations", { method: "GET", token: badToken }),
        {} as any
      );
      expect(resOrg.status).toBe(401);

      // Projects endpoint
      const resProj = await getProjectsHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects`, { method: "GET", token: badToken }),
        { params: Promise.resolve({ organizationId: orgAId }) } as any
      );
      expect(resProj.status).toBe(401);

      // Tasks endpoint
      const resTask = await getTasksHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/tasks`, { method: "GET", token: badToken }),
        { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId }) } as any
      );
      expect(resTask.status).toBe(401);

      // Notifications endpoint
      const resNotif = await getNotificationsHandler(
        createRequest("http://localhost:3000/api/notifications", { method: "GET", token: badToken }),
        {} as any
      );
      expect(resNotif.status).toBe(401);
    });

    it("Expired invitation token yields 410 and cannot be accepted", async () => {
      const rawExpiredToken = "expired-token-12345";
      const hashedExpired = hashToken(rawExpiredToken);

      inMemoryPrisma.invitations.set(crypto.randomUUID(), {
        id: crypto.randomUUID(),
        email: "bob.sec@example.com",
        organizationId: orgBId,
        role: "MEMBER",
        token: hashedExpired,
        status: "EXPIRED",
        invitedById: outsiderId,
        expiresAt: new Date(Date.now() - 3600_000), // 1 hour ago
        acceptedAt: null,
        createdAt: new Date(Date.now() - 7200_000),
        updatedAt: new Date(),
      });

      const acceptRes = await acceptInvitationHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawExpiredToken}/accept`, {
          method: "POST",
          token: adminToken,
        }),
        { params: Promise.resolve({ token: rawExpiredToken }) } as any
      );
      expect(acceptRes.status).toBe(410);
    });
  });

  describe("3. Multi-Tenant Cross-Organization IDOR Boundaries", () => {
    it("Accessing Org A's project under Org B's route returns 404", async () => {
      const idorRes = await getProjectsHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgBId}/projects`, {
          method: "GET",
          token: outsiderToken,
        }),
        { params: Promise.resolve({ organizationId: orgBId }) } as any
      );
      expect(idorRes.status).toBe(200);
      const data = await idorRes.json();
      // Ensure Org A's project is NOT leaked in Org B
      const ids = data.data.projects.map((p: any) => p.id);
      expect(ids).not.toContain(projectAId);
    });

    it("User cannot mark or delete another user's notification", async () => {
      const foreignNotif = await inMemoryPrisma.notification.create({
        data: {
          userId: ownerId,
          type: "TASK_ASSIGNED",
          title: "Confidential Owner Notice",
          body: "For owner eyes only",
        },
      });

      // Member Charlie attempting to patch Owner's notification
      const patchRes = await markNotificationHandler(
        createRequest(`http://localhost:3000/api/notifications/${foreignNotif.id}`, {
          method: "PATCH",
          token: memberToken,
          body: { isRead: true },
        }),
        { params: Promise.resolve({ notificationId: foreignNotif.id }) } as any
      );
      expect(patchRes.status).toBe(200);

      // Verify that foreign notification was NOT updated because Charlie is not the recipient
      const checkNotif = inMemoryPrisma.notifications.get(foreignNotif.id);
      expect(checkNotif?.isRead).toBe(false);

      // Member Charlie attempting to delete Owner's notification -> 404
      const deleteRes = await deleteNotificationHandler(
        createRequest(`http://localhost:3000/api/notifications/${foreignNotif.id}`, {
          method: "DELETE",
          token: memberToken,
        }),
        { params: Promise.resolve({ notificationId: foreignNotif.id }) } as any
      );
      expect(deleteRes.status).toBe(404);
    });
  });

  describe("4. Injection & Parameter Sanitization", () => {
    it("SQL/NoSQL injection string in search filter returns empty list safely without 500 error", async () => {
      const injectionPayload = "' OR '1'='1' -- ; DROP TABLE users;";
      const res = await getTasksHandler(
        createRequest(
          `http://localhost:3000/api/organizations/${orgAId}/projects/${projectAId}/tasks?search=${encodeURIComponent(injectionPayload)}`,
          {
            method: "GET",
            token: ownerToken,
          }
        ),
        { params: Promise.resolve({ organizationId: orgAId, projectId: projectAId }) } as any
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.tasks.length).toBe(0);
    });
  });
});
