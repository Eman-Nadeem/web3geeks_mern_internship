import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestData, createTestRequest, TestEntities } from '../helpers/testUtils';
import { GET as getProjectById, PATCH as updateProject, DELETE as deleteProject } from '@/app/api/projects/[id]/route';
import { GET as getTeamById, DELETE as deleteTeam } from '@/app/api/teams/[id]/route';
import { GET as getTaskById, PATCH as updateTask } from '@/app/api/tasks/[id]/route';
import Project from '@/models/Project';
import Team from '@/models/Team';
import Task from '@/models/Task';

describe('Tenant Isolation Boundaries', () => {
  let testData: TestEntities;
  let projectA: any;
  let teamA: any;
  let taskA: any;

  beforeEach(async () => {
    testData = await setupTestData();

    projectA = await Project.create({
      orgId: testData.orgA._id,
      name: 'Acme Secret Project',
      managerId: testData.managerA._id,
    });

    teamA = testData.teamA;

    taskA = await Task.create({
      orgId: testData.orgA._id,
      projectId: projectA._id,
      title: 'Acme Secret Task',
      status: 'TO_DO',
      reporterId: testData.managerA._id,
    });
  });

  it('prevents user from Org B from reading Org A project (404 Not Found)', async () => {
    const req = createTestRequest(`http://localhost:3000/api/projects/${projectA._id}`, {
      token: testData.tokens.adminB,
    });

    const res = await getProjectById(req, { params: Promise.resolve({ id: projectA._id.toString() }) });
    expect(res.status).toBe(404);
  });

  it('prevents user from Org B from updating Org A project (404 Not Found)', async () => {
    const req = createTestRequest(`http://localhost:3000/api/projects/${projectA._id}`, {
      method: 'PATCH',
      token: testData.tokens.adminB,
      body: { name: 'Hacked Project Name' },
    });

    const res = await updateProject(req, { params: Promise.resolve({ id: projectA._id.toString() }) });
    expect(res.status).toBe(404);

    const unchangedProject = await Project.findById(projectA._id);
    expect(unchangedProject?.name).toBe('Acme Secret Project');
  });

  it('prevents user from Org B from reading Org A team (404 Not Found)', async () => {
    const req = createTestRequest(`http://localhost:3000/api/teams/${teamA._id}`, {
      token: testData.tokens.adminB,
    });

    const res = await getTeamById(req, { params: Promise.resolve({ id: teamA._id.toString() }) });
    expect(res.status).toBe(404);
  });

  it('prevents user from Org B from deleting Org A team (404 Not Found)', async () => {
    const req = createTestRequest(`http://localhost:3000/api/teams/${teamA._id}`, {
      method: 'DELETE',
      token: testData.tokens.adminB,
    });

    const res = await deleteTeam(req, { params: Promise.resolve({ id: teamA._id.toString() }) });
    expect(res.status).toBe(404);

    const teamStillExists = await Team.findById(teamA._id);
    expect(teamStillExists).not.toBeNull();
  });

  it('prevents user from Org B from reading Org A task (404 Not Found)', async () => {
    const req = createTestRequest(`http://localhost:3000/api/tasks/${taskA._id}`, {
      token: testData.tokens.adminB,
    });

    const res = await getTaskById(req, { params: Promise.resolve({ id: taskA._id.toString() }) });
    expect(res.status).toBe(404);
  });

  it('prevents user from Org B from updating Org A task (404 Not Found)', async () => {
    const req = createTestRequest(`http://localhost:3000/api/tasks/${taskA._id}`, {
      method: 'PATCH',
      token: testData.tokens.adminB,
      body: { title: 'Hacked Task Title' },
    });

    const res = await updateTask(req, { params: Promise.resolve({ id: taskA._id.toString() }) });
    expect(res.status).toBe(404);

    const unchangedTask = await Task.findById(taskA._id);
    expect(unchangedTask?.title).toBe('Acme Secret Task');
  });
});
