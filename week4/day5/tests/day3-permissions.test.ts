import { describe, it, expect } from "vitest";
import {
  canViewProject,
  canCreateProject,
  canManageProject,
  canDeleteProject,
  canManageProjectMembers,
  canReassignProjectOwner,
} from "@/server/modules/projects/permissions";
import {
  canCreateTask,
  canEditTask,
  canChangeTaskStatus,
  canReassignTask,
  canDeleteTask,
} from "@/server/modules/tasks/permissions";

describe("Day 3 Permission Matrix - Pure Functions", () => {
  describe("Project Permissions", () => {
    it("canViewProject: org OWNER and ADMIN can view all projects; members can only view projects they belong to", () => {
      expect(canViewProject("OWNER", false)).toBe(true);
      expect(canViewProject("ADMIN", false)).toBe(true);
      expect(canViewProject("MEMBER", true)).toBe(true);
      expect(canViewProject("MEMBER", false)).toBe(false);
    });

    it("canCreateProject: only org OWNER and ADMIN can create projects", () => {
      expect(canCreateProject("OWNER")).toBe(true);
      expect(canCreateProject("ADMIN")).toBe(true);
      expect(canCreateProject("MEMBER")).toBe(false);
    });

    it("canManageProject: org OWNER, ADMIN, and Project Owner can update project details/status", () => {
      expect(canManageProject("OWNER", false)).toBe(true);
      expect(canManageProject("ADMIN", false)).toBe(true);
      expect(canManageProject("MEMBER", true)).toBe(true);
      expect(canManageProject("MEMBER", false)).toBe(false);
    });

    it("canDeleteProject: ONLY org OWNER and ADMIN can delete a project (Project Owner cannot delete unless Org Owner/Admin)", () => {
      expect(canDeleteProject("OWNER")).toBe(true);
      expect(canDeleteProject("ADMIN")).toBe(true);
      expect(canDeleteProject("MEMBER")).toBe(false);
    });

    it("canManageProjectMembers: org OWNER, ADMIN, and Project Owner can add/remove members", () => {
      expect(canManageProjectMembers("OWNER", false)).toBe(true);
      expect(canManageProjectMembers("ADMIN", false)).toBe(true);
      expect(canManageProjectMembers("MEMBER", true)).toBe(true);
      expect(canManageProjectMembers("MEMBER", false)).toBe(false);
    });

    it("canReassignProjectOwner: ONLY org OWNER and ADMIN can reassign project ownership", () => {
      expect(canReassignProjectOwner("OWNER")).toBe(true);
      expect(canReassignProjectOwner("ADMIN")).toBe(true);
      expect(canReassignProjectOwner("MEMBER")).toBe(false);
    });
  });

  describe("Task Permissions", () => {
    it("canCreateTask: org OWNER/ADMIN and project members/owner can create tasks", () => {
      expect(canCreateTask("OWNER", false)).toBe(true);
      expect(canCreateTask("ADMIN", false)).toBe(true);
      expect(canCreateTask("MEMBER", true)).toBe(true);
      expect(canCreateTask("MEMBER", false)).toBe(false);
    });

    it("canEditTask: org OWNER/ADMIN, project owner, creator, or assignee can edit task fields", () => {
      expect(canEditTask("OWNER", false, false, false)).toBe(true);
      expect(canEditTask("ADMIN", false, false, false)).toBe(true);
      expect(canEditTask("MEMBER", true, false, false)).toBe(true); // project owner
      expect(canEditTask("MEMBER", false, true, false)).toBe(true); // task creator
      expect(canEditTask("MEMBER", false, false, true)).toBe(true); // task assignee
      expect(canEditTask("MEMBER", false, false, false)).toBe(false); // random project member
    });

    it("canChangeTaskStatus: allows assignee, creator, project owner, or org admin", () => {
      expect(canChangeTaskStatus("OWNER", false, false, false)).toBe(true);
      expect(canChangeTaskStatus("ADMIN", false, false, false)).toBe(true);
      expect(canChangeTaskStatus("MEMBER", true, false, false)).toBe(true); // project owner
      expect(canChangeTaskStatus("MEMBER", false, true, false)).toBe(true); // creator
      expect(canChangeTaskStatus("MEMBER", false, false, true)).toBe(true); // assignee
      expect(canChangeTaskStatus("MEMBER", false, false, false)).toBe(false); // regular member
    });

    it("canReassignTask: any project member or owner or org admin can reassign tasks per matrix", () => {
      expect(canReassignTask("OWNER", false)).toBe(true);
      expect(canReassignTask("ADMIN", false)).toBe(true);
      expect(canReassignTask("MEMBER", true)).toBe(true);
      expect(canReassignTask("MEMBER", false)).toBe(false);
    });

    it("canDeleteTask: org OWNER/ADMIN, project owner, or task creator can delete; assignee cannot", () => {
      expect(canDeleteTask("OWNER", false, false)).toBe(true);
      expect(canDeleteTask("ADMIN", false, false)).toBe(true);
      expect(canDeleteTask("MEMBER", true, false)).toBe(true); // project owner
      expect(canDeleteTask("MEMBER", false, true)).toBe(true); // task creator
      expect(canDeleteTask("MEMBER", false, false)).toBe(false); // assignee only or random member
    });
  });
});
