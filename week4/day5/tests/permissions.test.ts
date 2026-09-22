import { describe, it, expect } from "vitest";
import {
  canViewMembers,
  canRemoveMember,
  canInviteRole,
  canManageInvitations,
  canEditOrgDetails,
  canEditSlug,
  canDeleteOrg,
} from "@/server/modules/memberships/permissions";

describe("Declarative RBAC Permissions Matrix", () => {
  describe("View Members", () => {
    it("allows OWNER, ADMIN, and MEMBER to view members", () => {
      expect(canViewMembers("OWNER")).toBe(true);
      expect(canViewMembers("ADMIN")).toBe(true);
      expect(canViewMembers("MEMBER")).toBe(true);
    });
  });

  describe("Remove Members", () => {
    it("OWNER can remove MEMBER and ADMIN, but cannot remove OWNER", () => {
      expect(canRemoveMember("OWNER", "MEMBER")).toBe(true);
      expect(canRemoveMember("OWNER", "ADMIN")).toBe(true);
      expect(canRemoveMember("OWNER", "OWNER")).toBe(false);
    });

    it("ADMIN can only remove MEMBER", () => {
      expect(canRemoveMember("ADMIN", "MEMBER")).toBe(true);
      expect(canRemoveMember("ADMIN", "ADMIN")).toBe(false);
      expect(canRemoveMember("ADMIN", "OWNER")).toBe(false);
    });

    it("MEMBER cannot remove anyone", () => {
      expect(canRemoveMember("MEMBER", "MEMBER")).toBe(false);
      expect(canRemoveMember("MEMBER", "ADMIN")).toBe(false);
      expect(canRemoveMember("MEMBER", "OWNER")).toBe(false);
    });
  });

  describe("Invite Role", () => {
    it("OWNER can invite ADMIN or MEMBER, but never OWNER", () => {
      expect(canInviteRole("OWNER", "ADMIN")).toBe(true);
      expect(canInviteRole("OWNER", "MEMBER")).toBe(true);
      expect(canInviteRole("OWNER", "OWNER")).toBe(false);
    });

    it("ADMIN can only invite MEMBER", () => {
      expect(canInviteRole("ADMIN", "MEMBER")).toBe(true);
      expect(canInviteRole("ADMIN", "ADMIN")).toBe(false);
      expect(canInviteRole("ADMIN", "OWNER")).toBe(false);
    });

    it("MEMBER cannot invite anyone", () => {
      expect(canInviteRole("MEMBER", "MEMBER")).toBe(false);
      expect(canInviteRole("MEMBER", "ADMIN")).toBe(false);
      expect(canInviteRole("MEMBER", "OWNER")).toBe(false);
    });
  });

  describe("Manage Invitations", () => {
    it("OWNER and ADMIN can manage invitations", () => {
      expect(canManageInvitations("OWNER")).toBe(true);
      expect(canManageInvitations("ADMIN")).toBe(true);
      expect(canManageInvitations("MEMBER")).toBe(false);
    });
  });

  describe("Edit Organization Details", () => {
    it("OWNER and ADMIN can edit name, description, and logo", () => {
      expect(canEditOrgDetails("OWNER")).toBe(true);
      expect(canEditOrgDetails("ADMIN")).toBe(true);
      expect(canEditOrgDetails("MEMBER")).toBe(false);
    });
  });

  describe("Edit Organization Slug", () => {
    it("ONLY OWNER can edit organization slug", () => {
      expect(canEditSlug("OWNER")).toBe(true);
      expect(canEditSlug("ADMIN")).toBe(false);
      expect(canEditSlug("MEMBER")).toBe(false);
    });
  });

  describe("Delete Organization", () => {
    it("ONLY OWNER can delete organization", () => {
      expect(canDeleteOrg("OWNER")).toBe(true);
      expect(canDeleteOrg("ADMIN")).toBe(false);
      expect(canDeleteOrg("MEMBER")).toBe(false);
    });
  });
});
