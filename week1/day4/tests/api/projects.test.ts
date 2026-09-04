import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestData, createTestRequest, TestEntities } from '../helpers/testUtils';
import { GET as getProjects, POST as createProject } from '@/app/api/projects/route';
import { GET as getProjectById, PATCH as updateProject, DELETE as deleteProject } from '@/app/api/projects/[id]/route';
import Project from '@/models/Project';
import Task from '@/models/Task';

describe('Projects API (/api/projects)', () => {
  let testData: TestEntities;

  beforeEach(async () => {
    testData = await setupTestData();
  });

  describe('POST /api/projects', () => {
    it('allows OrgAdmin to create a project with valid teamId', async () => {
      const req = createTestRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        token: testData.tokens.adminA,
        body: {
          name: 'Project Alpha',
          description: 'Initial project for Org A',
          teamId: testData.teamA._id.toString(),
          status: 'ACTIVE',
        },
      });

      const res = await createProject(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.project).toBeDefined();
      expect(json.project.name).toBe('Project Alpha');
      expect(json.project.orgId.toString()).toBe(testData.orgA._id.toString());
    });

    it('blocks TeamMember from creating a project (403 Forbidden)', async () => {
      const req = createTestRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        token: testData.tokens.memberA1,
        body: {
          name: 'Unauthorized Project',
        },
      });

      const res = await createProject(req);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe('FORBIDDEN');
    });

    it('rejects creating project with a team belonging to another organization (400 Bad Request)', async () => {
      const req = createTestRequest('http://localhost:3000/api/projects', {
        method: 'POST',
        token: testData.tokens.adminA,
        body: {
          name: 'Cross-Tenant Team Project',
          teamId: testData.teamB._id.toString(), // Team B belongs to Org B
        },
      });

      const res = await createProject(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('INVALID_TEAM');
    });
  });

  describe('GET /api/projects', () => {
    it('returns projects scoped strictly to user organization', async () => {
      await Project.create({
        orgId: testData.orgA._id,
        name: 'Org A Project',
        managerId: testData.managerA._id,
      });

      await Project.create({
        orgId: testData.orgB._id,
        name: 'Org B Project',
        managerId: testData.adminB._id,
      });

      const req = createTestRequest('http://localhost:3000/api/projects', {
        token: testData.tokens.adminA,
      });

      const res = await getProjects(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.projects.length).toBe(1);
      expect(json.projects[0].name).toBe('Org A Project');
    });
  });

  describe('PATCH /api/projects/[id]', () => {
    it('rejects updating project with manager from another organization (400 Bad Request)', async () => {
      const project = await Project.create({
        orgId: testData.orgA._id,
        name: 'Project to Update',
        managerId: testData.managerA._id,
      });

      const req = createTestRequest(`http://localhost:3000/api/projects/${project._id}`, {
        method: 'PATCH',
        token: testData.tokens.adminA,
        body: {
          managerId: testData.adminB._id.toString(), // Admin B belongs to Org B
        },
      });

      const res = await updateProject(req, { params: Promise.resolve({ id: project._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('INVALID_MANAGER');
    });
  });

  describe('DELETE /api/projects/[id]', () => {
    it('blocks deletion when active tasks exist unless force=true', async () => {
      const project = await Project.create({
        orgId: testData.orgA._id,
        name: 'Project with Active Task',
        managerId: testData.managerA._id,
      });

      await Task.create({
        orgId: testData.orgA._id,
        projectId: project._id,
        title: 'Active Task',
        status: 'IN_PROGRESS',
        reporterId: testData.managerA._id,
      });

      // Without force=true
      const req = createTestRequest(`http://localhost:3000/api/projects/${project._id}`, {
        method: 'DELETE',
        token: testData.tokens.adminA,
      });

      const res = await deleteProject(req, { params: Promise.resolve({ id: project._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('BUSINESS_RULE_VIOLATION');

      // With force=true
      const forceReq = createTestRequest(`http://localhost:3000/api/projects/${project._id}?force=true`, {
        method: 'DELETE',
        token: testData.tokens.adminA,
      });

      const forceRes = await deleteProject(forceReq, { params: Promise.resolve({ id: project._id.toString() }) });
      expect(forceRes.status).toBe(200);

      // Verify cascading cleanup of active tasks
      const remainingTasks = await Task.countDocuments({ projectId: project._id });
      expect(remainingTasks).toBe(0);
    });
  });
});
