import connectToDatabase from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Team from '@/models/Team';
import Project from '@/models/Project';
import Task from '@/models/Task';
import AuditLog from '@/models/AuditLog';
import Notification from '@/models/Notification';
import { signAccessToken, hashPassword } from '@/lib/auth';
import { NextRequest } from 'next/server';

export interface TestEntities {
  orgA: any;
  orgB: any;
  adminA: any;
  managerA: any;
  memberA1: any;
  memberA2: any;
  adminB: any;
  tokens: {
    adminA: string;
    managerA: string;
    memberA1: string;
    memberA2: string;
    adminB: string;
  };
  teamA: any;
  teamB: any;
}

export async function setupTestData(): Promise<TestEntities> {
  await connectToDatabase();

  // Clear existing test data
  await Promise.all([
    Organization.deleteMany({}),
    User.deleteMany({}),
    Team.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  // Create Organizations
  const orgA = await Organization.create({
    name: 'Acme Corp Test',
    slug: 'acme-test-' + Date.now(),
    plan: 'ENTERPRISE',
  });

  const orgB = await Organization.create({
    name: 'Beta Inc Test',
    slug: 'beta-test-' + Date.now(),
    plan: 'PRO',
  });

  const defaultPasswordHash = await hashPassword('Password123!');

  // Create Users for Org A
  const adminA = await User.create({
    orgId: orgA._id,
    email: `admin-a-${Date.now()}@acme.com`,
    passwordHash: defaultPasswordHash,
    fullName: 'Alice Admin',
    role: 'OrgAdmin',
  });

  const managerA = await User.create({
    orgId: orgA._id,
    email: `manager-a-${Date.now()}@acme.com`,
    passwordHash: defaultPasswordHash,
    fullName: 'Bob Manager',
    role: 'ProjectManager',
  });

  const memberA1 = await User.create({
    orgId: orgA._id,
    email: `member-a1-${Date.now()}@acme.com`,
    passwordHash: defaultPasswordHash,
    fullName: 'Charlie Member 1',
    role: 'TeamMember',
  });

  const memberA2 = await User.create({
    orgId: orgA._id,
    email: `member-a2-${Date.now()}@acme.com`,
    passwordHash: defaultPasswordHash,
    fullName: 'David Member 2',
    role: 'TeamMember',
  });

  // Create User for Org B
  const adminB = await User.create({
    orgId: orgB._id,
    email: `admin-b-${Date.now()}@beta.com`,
    passwordHash: defaultPasswordHash,
    fullName: 'Eve Admin B',
    role: 'OrgAdmin',
  });

  // Generate Tokens
  const [tokenAdminA, tokenManagerA, tokenMemberA1, tokenMemberA2, tokenAdminB] =
    await Promise.all([
      signAccessToken({
        userId: adminA._id.toString(),
        orgId: orgA._id.toString(),
        email: adminA.email,
        role: adminA.role,
      }),
      signAccessToken({
        userId: managerA._id.toString(),
        orgId: orgA._id.toString(),
        email: managerA.email,
        role: managerA.role,
      }),
      signAccessToken({
        userId: memberA1._id.toString(),
        orgId: orgA._id.toString(),
        email: memberA1.email,
        role: memberA1.role,
      }),
      signAccessToken({
        userId: memberA2._id.toString(),
        orgId: orgA._id.toString(),
        email: memberA2.email,
        role: memberA2.role,
      }),
      signAccessToken({
        userId: adminB._id.toString(),
        orgId: orgB._id.toString(),
        email: adminB.email,
        role: adminB.role,
      }),
    ]);

  // Create Team A in Org A
  const teamA = await Team.create({
    orgId: orgA._id,
    name: 'Frontend Alpha',
    description: 'Alpha team for frontend apps',
    leaderId: managerA._id,
    memberIds: [memberA1._id],
  });

  // Create Team B in Org B
  const teamB = await Team.create({
    orgId: orgB._id,
    name: 'Backend Beta',
    description: 'Beta team for backend apps',
    leaderId: adminB._id,
    memberIds: [],
  });

  return {
    orgA,
    orgB,
    adminA,
    managerA,
    memberA1,
    memberA2,
    adminB,
    tokens: {
      adminA: tokenAdminA,
      managerA: tokenManagerA,
      memberA1: tokenMemberA1,
      memberA2: tokenMemberA2,
      adminB: tokenAdminB,
    },
    teamA,
    teamB,
  };
}

export function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const reqInit: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(options.method || 'GET')) {
    reqInit.body = JSON.stringify(options.body);
  }

  return new NextRequest(url, reqInit as any);
}
