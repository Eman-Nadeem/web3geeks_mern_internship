import { describe, it, expect, beforeEach } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as createOrgHandler } from "@/app/api/organizations/route";
import {
  PATCH as updateOrgHandler,
} from "@/app/api/organizations/[organizationId]/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { inMemoryPrisma } from "./helpers/mock-prisma";
import { Role, UserDTO } from "@/types";

describe("Organization Settings & Slug Management", () => {
  let ownerToken: string;
  let adminToken: string;
  let memberToken: string;
  let ownerUser: UserDTO;
  let adminUser: UserDTO;
  let memberUser: UserDTO;
  let orgId: string;

  beforeEach(async () => {
    const ownerRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Alice Owner", email: "owner@example.com", password: "Password123!" },
      }),
      {} as any
    );
    ownerToken = ownerRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    ownerUser = (await ownerRes.json()).data.user;

    const adminRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Bob Admin", email: "admin@example.com", password: "Password123!" },
      }),
      {} as any
    );
    adminToken = adminRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    adminUser = (await adminRes.json()).data.user;

    const memberRes = await registerHandler(
      createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: { name: "Carol Member", email: "member@example.com", password: "Password123!" },
      }),
      {} as any
    );
    memberToken = memberRes.cookies.get(AUTH_COOKIE_NAME)!.value;
    memberUser = (await memberRes.json()).data.user;

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
      data: { userId: adminUser.id, organizationId: orgId, role: Role.ADMIN },
    });
    await inMemoryPrisma.membership.create({
      data: { userId: memberUser.id, organizationId: orgId, role: Role.MEMBER },
    });
  });

  it("MEMBER gets 403 on PATCH", async () => {
    const res = await updateOrgHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: memberToken,
        body: { name: "New Name" },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(res.status).toBe(403);
  });

  it("ADMIN can update name, description, and logoUrl (200), but gets 403 when modifying slug", async () => {
    // Admin updates name & description
    const res1 = await updateOrgHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: adminToken,
        body: {
          name: "Updated Acme",
          description: "A great team working on innovative technology.",
          logoUrl: "https://example.com/logo.png",
        },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(res1.status).toBe(200);
    const json1 = await res1.json();
    expect(json1.data.organization.name).toBe("Updated Acme");
    expect(json1.data.organization.description).toBe("A great team working on innovative technology.");

    // Admin attempts to modify slug -> 403
    const res2 = await updateOrgHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: adminToken,
        body: { slug: "new-acme-slug" },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(res2.status).toBe(403);
  });

  it("OWNER can update name, description, logoUrl, and slug (200)", async () => {
    const res = await updateOrgHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: ownerToken,
        body: {
          name: "Owner Modified Acme",
          slug: "owner-new-slug",
          description: "Owner updated description",
        },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.organization.slug).toBe("owner-new-slug");
  });

  it("description exceeding 500 characters returns 400 validation error", async () => {
    const longDescription = "a".repeat(501);
    const res = await updateOrgHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: ownerToken,
        body: { description: longDescription },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(res.status).toBe(400);
    expect((await res.json()).message).toContain("500 characters");
  });

  it("slug collision with another organization returns 409", async () => {
    // Create second organization
    await inMemoryPrisma.organization.create({
      data: { name: "Beta Corp", slug: "beta-corp", ownerId: ownerUser.id },
    });

    const res = await updateOrgHandler(
      createRequest(`http://localhost:3000/api/organizations/${orgId}`, {
        method: "PATCH",
        token: ownerToken,
        body: { slug: "beta-corp" },
      }),
      { params: Promise.resolve({ organizationId: orgId }) } as any
    );
    expect(res.status).toBe(409);
    expect((await res.json()).message).toContain("already taken");
  });
});
