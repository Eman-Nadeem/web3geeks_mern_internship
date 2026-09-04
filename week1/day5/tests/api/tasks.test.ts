import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestData, createTestRequest, TestEntities } from '../helpers/testUtils';
import { POST as createTask } from '@/app/api/tasks/route';
import { PATCH as updateTask } from '@/app/api/tasks/[id]/route';
import Project from '@/models/Project';
import Task from '@/models/Task';

describe('Tasks API (/api/tasks)', () => {
  let testData: TestEntities;
  let projectWithTeam: any;
  let projectWithoutTeam: any;

  beforeEach(async () => {
    testData = await setupTestData();

    // Create project linked to teamA (memberA1 is member of teamA, memberA2 is NOT)
    projectWithTeam = await Project.create({
      orgId: testData.orgA._id,
      name: 'Project with Team A',
      teamId: testData.teamA._id,
      managerId: testData.managerA._id,
    });

    // Create project without a team
    projectWithoutTeam = await Project.create({
      orgId: testData.orgA._id,
      name: 'Standalone Project',
      managerId: testData.managerA._id,
    });
  });

  describe('POST /api/tasks (Team-level Assignee Validation)', () => {
    it('allows assigning task to a user who belongs to the project team', async () => {
      const req = createTestRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        token: testData.tokens.managerA,
        body: {
          projectId: projectWithTeam._id.toString(),
          title: 'Team Member Task',
          assigneeId: testData.memberA1._id.toString(), // memberA1 is in teamA
        },
      });

      const res = await createTask(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.task.title).toBe('Team Member Task');
    });

    it('rejects assigning task to a user outside the project team (400 Bad Request)', async () => {
      const req = createTestRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        token: testData.tokens.managerA,
        body: {
          projectId: projectWithTeam._id.toString(),
          title: 'Non-team member assignment',
          assigneeId: testData.memberA2._id.toString(), // memberA2 is in Org A but NOT in teamA
        },
      });

      const res = await createTask(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('INVALID_ASSIGNEE');
      expect(json.message).toContain('team assigned to this project');
    });
  });

  describe('PATCH /api/tasks/[id] (State Machine & RBAC Controls)', () => {
    it('enforces valid status transition TO_DO -> IN_PROGRESS', async () => {
      const task = await Task.create({
        orgId: testData.orgA._id,
        projectId: projectWithTeam._id,
        title: 'Status Test Task',
        status: 'TO_DO',
        assigneeId: testData.memberA1._id,
        reporterId: testData.managerA._id,
      });

      const req = createTestRequest(`http://localhost:3000/api/tasks/${task._id}`, {
        method: 'PATCH',
        token: testData.tokens.memberA1,
        body: {
          status: 'IN_PROGRESS',
        },
      });

      const res = await updateTask(req, { params: Promise.resolve({ id: task._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.task.status).toBe('IN_PROGRESS');
    });

    it('rejects invalid status transition TO_DO -> COMPLETED (400 Bad Request)', async () => {
      const task = await Task.create({
        orgId: testData.orgA._id,
        projectId: projectWithTeam._id,
        title: 'Illegal Jump Task',
        status: 'TO_DO',
        assigneeId: testData.memberA1._id,
        reporterId: testData.managerA._id,
      });

      const req = createTestRequest(`http://localhost:3000/api/tasks/${task._id}`, {
        method: 'PATCH',
        token: testData.tokens.memberA1,
        body: {
          status: 'COMPLETED',
        },
      });

      const res = await updateTask(req, { params: Promise.resolve({ id: task._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('INVALID_STATUS_TRANSITION');
    });

    it('prevents TeamMember from updating task assigned to someone else (403 Forbidden)', async () => {
      const task = await Task.create({
        orgId: testData.orgA._id,
        projectId: projectWithTeam._id,
        title: 'David Task',
        status: 'TO_DO',
        assigneeId: testData.memberA2._id, // Assigned to David (memberA2)
        reporterId: testData.managerA._id,
      });

      // Charlie (memberA1) attempts to update David's task
      const req = createTestRequest(`http://localhost:3000/api/tasks/${task._id}`, {
        method: 'PATCH',
        token: testData.tokens.memberA1,
        body: {
          status: 'IN_PROGRESS',
        },
      });

      const res = await updateTask(req, { params: Promise.resolve({ id: task._id.toString() }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('FORBIDDEN');
    });

    it('prevents TeamMember from reassigning task to another user (403 Forbidden)', async () => {
      const task = await Task.create({
        orgId: testData.orgA._id,
        projectId: projectWithTeam._id,
        title: 'Reassign Test Task',
        status: 'TO_DO',
        assigneeId: testData.memberA1._id,
        reporterId: testData.managerA._id,
      });

      // memberA1 attempts to reassign task to memberA2
      const req = createTestRequest(`http://localhost:3000/api/tasks/${task._id}`, {
        method: 'PATCH',
        token: testData.tokens.memberA1,
        body: {
          assigneeId: testData.memberA2._id.toString(),
        },
      });

      const res = await updateTask(req, { params: Promise.resolve({ id: task._id.toString() }) });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('FORBIDDEN');
    });
  });
});
