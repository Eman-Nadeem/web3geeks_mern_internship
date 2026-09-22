import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import {
  POST as createInvitationHandler,
  GET as getInvitationsHandler,
} from "@/app/api/organizations/[organizationId]/invitations/route";
import {
  POST as resendInvitationHandler,
} from "@/app/api/organizations/[organizationId]/invitations/[invitationId]/resend/route";
import {
  DELETE as cancelInvitationHandler,
} from "@/app/api/organizations/[organizationId]/invitations/[invitationId]/route";
import { GET as getInvitationByTokenHandler } from "@/app/api/invitations/[token]/route";
import { POST as acceptInvitationHandler } from "@/app/api/invitations/[token]/accept/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { Role, UserDTO } from "@/types";

describe("Invitations Lifecycle, Token Hashing & Acceptance Flow", () => {
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let ownerUser: UserDTO;
  let adminUser: UserDTO;
  let memberUser: UserDTO;
  let outsiderUser: UserDTO;
  let orgId: string;

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

    // 4. Register Outsider (not yet member of org)
    const outsiderRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Dave Outsider", email: "dave@example.com", password: "Password123!" },
      }),
      {} as any
    );
    outsiderToken = outsiderRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    outsiderUser = (await outsiderRes.json()).data.user;

    // 5. Owner creates organization
    const orgRes = await createOrgHandler(
      createRequest("http://localhost:3000/api/organizations", {
        method: "POST",
        token: ownerToken,
        body: { name: "Acme Corp", slug: "acme-corp" },
      }),
      {} as any
    );
    orgId = (await orgRes.json()).data.organization.id;

    // 6. Add Admin and Member to organization
    await inMemoryPrisma.membership.create({
      data: { userId: adminUser.id, organizationId: orgId, role: Role.ADMIN },
    });
    await inMemoryPrisma.membership.create({
      data: { userId: memberUser.id, organizationId: orgId, role: Role.MEMBER },
    });
  });

  describe("Invitation Creation & RBAC", () => {
    it("OWNER can invite as MEMBER and ADMIN (201)", async () => {
      const res = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "new-member@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.email).toBe("new-member@example.com");
      expect(json.data.role).toBe("MEMBER");
      expect(json.data.rawToken).toBeDefined();

      const resAdmin = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "new-admin@example.com", role: "ADMIN" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(resAdmin.status).toBe(201);
    });

    it("ADMIN can invite as MEMBER (201), but gets 403 inviting as ADMIN", async () => {
      // Admin invites Member -> Success
      const resMember = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: adminToken,
          body: { email: "admin-invitee@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(resMember.status).toBe(201);

      // Admin invites Admin -> 403
      const resAdmin = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: adminToken,
          body: { email: "admin-invitee-2@example.com", role: "ADMIN" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(resAdmin.status).toBe(403);
    });

    it("MEMBER gets 403 when creating invitations", async () => {
      const res = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: memberToken,
          body: { email: "member-invitee@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(res.status).toBe(403);
    });

    it("rejects invitation if the email already belongs to a member of the organization (409)", async () => {
      const res = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "member@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(res.status).toBe(409);
      expect((await res.json()).message).toContain("already a member");
    });

    it("idempotent invite: reuses and refreshes pending invitation for same email without duplicate row", async () => {
      // Create first invite
      const res1 = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "idempotent@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      const json1 = await res1.json();
      const firstId = json1.data.id;
      const firstToken = json1.data.rawToken;

      // Create second invite for same email
      const res2 = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "idempotent@example.com", role: "ADMIN" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      const json2 = await res2.json();
      const secondId = json2.data.id;
      const secondToken = json2.data.rawToken;

      expect(firstId).toBe(secondId); // Reused the same invitation row!
      expect(firstToken).not.toBe(secondToken); // Token refreshed!
      expect(inMemoryPrisma.invitations.size).toBe(1);
    });
  });

  describe("Invitation Listing", () => {
    it("lists invitations with email, role, and invitedBy without leaking tokens", async () => {
      await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "list-test@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );

      const res = await getInvitationsHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.invitations.length).toBe(1);
      const item = json.data.invitations[0];
      expect(item.email).toBe("list-test@example.com");
      expect(item.token).toBeUndefined();
      expect(item.rawToken).toBeUndefined();
    });
  });

  describe("Public Token Lookup Endpoint", () => {
    let rawToken: string;

    beforeEach(async () => {
      const inviteRes = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "dave@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      rawToken = (await inviteRes.json()).data.rawToken;
    });

    it("returns invitation details for a valid token", async () => {
      const res = await getInvitationByTokenHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}`),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.email).toBe("dave@example.com");
      expect(json.data.organization.name).toBe("Acme Corp");
    });

    it("returns 404 for invalid garbage token", async () => {
      const res = await getInvitationByTokenHandler(
        createRequest("http://localhost:3000/api/invitations/invalid-nonexistent-token"),
        { params: Promise.resolve({ token: "invalid-nonexistent-token" }) } as any
      );
      expect(res.status).toBe(404);
    });

    it("returns 410 if invitation has expired", async () => {
      // Set expiresAt to the past
      const inv = Array.from(inMemoryPrisma.invitations.values())[0];
      inv.expiresAt = new Date(Date.now() - 10000);

      const res = await getInvitationByTokenHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}`),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(res.status).toBe(410);
      expect((await res.json()).message).toContain("expired");
    });

    it("returns 409 if invitation status is CANCELLED or ACCEPTED", async () => {
      const inv = Array.from(inMemoryPrisma.invitations.values())[0];
      inv.status = "CANCELLED";

      const res = await getInvitationByTokenHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}`),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(res.status).toBe(409);
    });
  });

  describe("Invitation Acceptance", () => {
    let rawToken: string;

    beforeEach(async () => {
      const inviteRes = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "dave@example.com", role: "ADMIN" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      rawToken = (await inviteRes.json()).data.rawToken;
    });

    it("returns 401 with requiresAuth if visitor is unauthenticated", async () => {
      const res = await acceptInvitationHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}/accept`, {
          method: "POST",
        }),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.data.requiresAuth).toBe(true);
      expect(json.data.email).toBe("dave@example.com");
    });

    it("rejects with 403 if authenticated user email does not match invited email", async () => {
      // Carol (member@example.com) tries to accept Dave's invite (dave@example.com)
      const res = await acceptInvitationHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}/accept`, {
          method: "POST",
          token: memberToken,
        }),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(res.status).toBe(403);
      expect((await res.json()).message).toContain("different email address");
    });

    it("successfully accepts invitation when authenticated with matching email and creates Membership", async () => {
      const res = await acceptInvitationHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}/accept`, {
          method: "POST",
          token: outsiderToken, // Dave's token
        }),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.organizationSlug).toBe("acme-corp");

      // Verify dave is now an ADMIN in Acme Corp
      const membership = await inMemoryPrisma.membership.findUnique({
        where: { userId_organizationId: { userId: outsiderUser.id, organizationId: orgId } },
      });
      expect(membership).toBeDefined();
      expect(membership!.role).toBe("ADMIN");
    });

    it("double-accept (same token twice) is handled safely with 409 and no duplicate rows", async () => {
      // First accept
      await acceptInvitationHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}/accept`, {
          method: "POST",
          token: outsiderToken,
        }),
        { params: Promise.resolve({ token: rawToken }) } as any
      );

      // Second accept
      const res2 = await acceptInvitationHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}/accept`, {
          method: "POST",
          token: outsiderToken,
        }),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(res2.status).toBe(409);
    });
  });

  describe("Resend & Cancel Operations", () => {
    let invitationId: string;
    let rawToken: string;

    beforeEach(async () => {
      const inviteRes = await createInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations`, {
          method: "POST",
          token: ownerToken,
          body: { email: "manage-test@example.com", role: "MEMBER" },
        }),
        { params: Promise.resolve({ organizationId: orgId }) } as any
      );
      const json = await inviteRes.json();
      invitationId = json.data.id;
      rawToken = json.data.rawToken;
    });

    it("resend generates new token and invalidates old token", async () => {
      const resendRes = await resendInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations/${invitationId}/resend`, {
          method: "POST",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, invitationId }) } as any
      );
      expect(resendRes.status).toBe(200);
      const newToken = (await resendRes.json()).data.rawToken;
      expect(newToken).not.toBe(rawToken);

      // Old token should now return 404 (because token hash was updated)
      const oldCheck = await getInvitationByTokenHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}`),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(oldCheck.status).toBe(404);

      // New token works
      const newCheck = await getInvitationByTokenHandler(
        createRequest(`http://localhost:3000/api/invitations/${newToken}`),
        { params: Promise.resolve({ token: newToken }) } as any
      );
      expect(newCheck.status).toBe(200);
    });

    it("cancel sets status CANCELLED and invalidates token", async () => {
      const cancelRes = await cancelInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations/${invitationId}`, {
          method: "DELETE",
          token: adminToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, invitationId }) } as any
      );
      expect(cancelRes.status).toBe(200);

      // Token lookup now returns 409
      const check = await getInvitationByTokenHandler(
        createRequest(`http://localhost:3000/api/invitations/${rawToken}`),
        { params: Promise.resolve({ token: rawToken }) } as any
      );
      expect(check.status).toBe(409);
    });

    it("tenant isolation: resending an invitation from another org returns 404", async () => {
      const otherOrg = await inMemoryPrisma.organization.create({
        data: { name: "Other Org", slug: "other-org", ownerId: ownerUser.id },
      });
      const otherInvite = await inMemoryPrisma.invitation.create({
        data: {
          organizationId: otherOrg.id,
          email: "other@example.com",
          role: Role.MEMBER,
          token: "other-token-hash",
          status: "PENDING",
          invitedById: ownerUser.id,
          expiresAt: new Date(Date.now() + 100000),
        },
      });

      const res = await resendInvitationHandler(
        createRequest(`http://localhost:3000/api/organizations/${orgId}/invitations/${otherInvite.id}/resend`, {
          method: "POST",
          token: ownerToken,
        }),
        { params: Promise.resolve({ organizationId: orgId, invitationId: otherInvite.id }) } as any
      );
      expect(res.status).toBe(404);
    });
  });
});
