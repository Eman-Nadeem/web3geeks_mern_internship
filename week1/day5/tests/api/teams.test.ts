import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestData, createTestRequest, TestEntities } from '../helpers/testUtils';
import { GET as getTeams, POST as createTeam } from '@/app/api/teams/route';
import { GET as getTeamById, DELETE as deleteTeam } from '@/app/api/teams/[id]/route';
import { POST as addMember, DELETE as removeMember } from '@/app/api/teams/[id]/members/route';
import Project from '@/models/Project';

describe('Teams API (/api/teams)', () => {
  let testData: TestEntities;

  beforeEach(async () => {
    testData = await setupTestData();
  });

  describe('GET /api/teams (TEAM_READ permission check)', () => {
    it('allows a regular TeamMember to view teams in their organization', async () => {
      const req = createTestRequest('http://localhost:3000/api/teams', {
        token: testData.tokens.memberA1,
      });

      const res = await getTeams(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teams).toBeDefined();
      expect(json.teams.length).toBe(1);
      expect(json.teams[0].name).toBe('Frontend Alpha');
    });

    it('allows a regular TeamMember to view single team by ID', async () => {
      const req = createTestRequest(`http://localhost:3000/api/teams/${testData.teamA._id}`, {
        token: testData.tokens.memberA1,
      });

      const res = await getTeamById(req, { params: Promise.resolve({ id: testData.teamA._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.team.name).toBe('Frontend Alpha');
    });
  });

  describe('POST /api/teams (RBAC)', () => {
    it('allows OrgAdmin to create a team', async () => {
      const req = createTestRequest('http://localhost:3000/api/teams', {
        method: 'POST',
        token: testData.tokens.adminA,
        body: {
          name: 'Backend Beta Team',
          description: 'Dev team',
        },
      });

      const res = await createTeam(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.team.name).toBe('Backend Beta Team');
    });

    it('blocks TeamMember from creating a team (403 Forbidden)', async () => {
      const req = createTestRequest('http://localhost:3000/api/teams', {
        method: 'POST',
        token: testData.tokens.memberA1,
        body: {
          name: 'Forbidden Team',
        },
      });

      const res = await createTeam(req);
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/teams/[id] Safety Check', () => {
    it('blocks deleting team referenced by a project unless force=true', async () => {
      // Link teamA to a project
      await Project.create({
        orgId: testData.orgA._id,
        name: 'Project with Team',
        teamId: testData.teamA._id,
        managerId: testData.managerA._id,
      });

      // Try delete without force
      const req = createTestRequest(`http://localhost:3000/api/teams/${testData.teamA._id}`, {
        method: 'DELETE',
        token: testData.tokens.adminA,
      });

      const res = await deleteTeam(req, { params: Promise.resolve({ id: testData.teamA._id.toString() }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('BUSINESS_RULE_VIOLATION');

      // Delete with force=true
      const forceReq = createTestRequest(`http://localhost:3000/api/teams/${testData.teamA._id}?force=true`, {
        method: 'DELETE',
        token: testData.tokens.adminA,
      });

      const forceRes = await deleteTeam(forceReq, { params: Promise.resolve({ id: testData.teamA._id.toString() }) });
      expect(forceRes.status).toBe(200);
    });
  });

  describe('Team Members Management', () => {
    it('rejects adding a member from another organization (404/400)', async () => {
      const req = createTestRequest(`http://localhost:3000/api/teams/${testData.teamA._id}/members`, {
        method: 'POST',
        token: testData.tokens.adminA,
        body: {
          userId: testData.adminB._id.toString(), // User from Org B
        },
      });

      const res = await addMember(req, { params: Promise.resolve({ id: testData.teamA._id.toString() }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe('USER_NOT_FOUND');
    });

    it('successfully adds member belonging to same organization', async () => {
      const req = createTestRequest(`http://localhost:3000/api/teams/${testData.teamA._id}/members`, {
        method: 'POST',
        token: testData.tokens.adminA,
        body: {
          userId: testData.memberA2._id.toString(),
        },
      });

      const res = await addMember(req, { params: Promise.resolve({ id: testData.teamA._id.toString() }) });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.team.memberIds.some((m: any) => m._id.toString() === testData.memberA2._id.toString())).toBe(true);
    });
  });
});
