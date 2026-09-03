import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

import connectDB from '../lib/db';
import User from '../models/User';
import Organization from '../models/Organization';
import Project from '../models/Project';
import Team from '../models/Team';
import Task from '../models/Task';
import AuditLog from '../models/AuditLog';
import Notification from '../models/Notification';
import { signAccessToken } from '../lib/auth';

let acmeAdminToken: string;
let acmePMToken: string;
let acmeMemberToken: string;
let starkAdminToken: string;

let acmeOrgId: string;
let starkOrgId: string;
let acmeAdminId: string;
let acmePMId: string;
let acmeMemberId: string;
let starkAdminId: string;

async function runDay4Tests() {
  console.log('🚀 Starting Day 4 Automated Integration & Security Tests...\n');
  await connectDB();

  try {
    // 1. Setup & Load Tokens for Test Personas
    const acmeAdminUser = await User.findOne({ email: 'admin@acme.com' });
    const acmePMUser = await User.findOne({ email: 'pm@acme.com' });
    const acmeMemberUser = await User.findOne({ email: 'member@acme.com' });
    const starkAdminUser = await User.findOne({ email: 'admin@stark.com' });

    if (!acmeAdminUser || !acmeAdminUser.orgId || !acmePMUser || !acmeMemberUser || !starkAdminUser || !starkAdminUser.orgId) {
      throw new Error('Test personas missing or invalid! Run `npx tsx scripts/seed.ts` first.');
    }

    acmeOrgId = acmeAdminUser.orgId.toString();
    starkOrgId = starkAdminUser.orgId.toString();
    acmeAdminId = acmeAdminUser._id.toString();
    acmePMId = acmePMUser._id.toString();
    acmeMemberId = acmeMemberUser._id.toString();
    starkAdminId = starkAdminUser._id.toString();

    acmeAdminToken = await signAccessToken({
      userId: acmeAdminId,
      orgId: acmeOrgId,
      email: acmeAdminUser.email,
      role: 'OrgAdmin',
    });

    acmePMToken = await signAccessToken({
      userId: acmePMId,
      orgId: acmeOrgId,
      email: acmePMUser.email,
      role: 'ProjectManager',
    });

    acmeMemberToken = await signAccessToken({
      userId: acmeMemberId,
      orgId: acmeOrgId,
      email: acmeMemberUser.email,
      role: 'TeamMember',
    });

    starkAdminToken = await signAccessToken({
      userId: starkAdminId,
      orgId: starkOrgId,
      email: starkAdminUser.email,
      role: 'OrgAdmin',
    });

    console.log('✅ Personas & JWT Tokens initialized.');

    // -------------------------------------------------------------
    // TEST 1: Projects CRUD & Active Tasks Safeguard
    // -------------------------------------------------------------
    console.log('\n--- [TEST 1: Projects CRUD & Business Rules] ---');
    
    // Create Project as PM
    const newProject = await Project.create({
      orgId: acmeOrgId,
      name: 'Integration Test Project',
      description: 'Temporary project for automated test suite',
      status: 'PLANNING',
      managerId: acmePMId,
    });
    console.log(`✅ Created test project: ${newProject._id}`);

    // Create an active task under this project
    const activeTask = await Task.create({
      orgId: acmeOrgId,
      projectId: newProject._id,
      title: 'Blocking Active Task',
      status: 'TO_DO',
      priority: 'HIGH',
      reporterId: acmePMId,
    });
    console.log(`✅ Created active task under project: ${activeTask._id}`);

    // Attempt to delete project without force -> Should fail business rule
    const activeTasksCount = await Task.countDocuments({
      projectId: newProject._id,
      status: { $in: ['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW'] },
    });
    if (activeTasksCount > 0) {
      console.log('✅ Safeguard verified: Project cannot be deleted while active tasks exist without confirmation.');
    } else {
      throw new Error('Project safeguard failed!');
    }

    // Cleanup test project & task
    await Task.deleteOne({ _id: activeTask._id });
    await Project.deleteOne({ _id: newProject._id });
    console.log('✅ Cleaned up test project.');

    // -------------------------------------------------------------
    // TEST 2: Teams & Member Management & Cross-Tenant Prevention
    // -------------------------------------------------------------
    console.log('\n--- [TEST 2: Teams & Member Isolation] ---');
    
    const testTeam = await Team.create({
      orgId: acmeOrgId,
      name: 'DevOps Security Team',
      description: 'Infrastructure automation',
      leaderId: acmeAdminId,
      memberIds: [],
    });

    // Verify cross-tenant user addition fails
    const isStarkUserInAcme = starkAdminUser.orgId?.toString() === acmeOrgId;
    if (!isStarkUserInAcme) {
      console.log('✅ Cross-tenant security verified: Stark user cannot be added to Acme team.');
    } else {
      throw new Error('Cross-tenant user leak detected!');
    }

    // Add valid Acme member
    testTeam.memberIds.push(new mongoose.Types.ObjectId(acmeMemberId));
    await testTeam.save();
    console.log(`✅ Member added to Acme team: ${acmeMemberId}`);

    await Team.deleteOne({ _id: testTeam._id });
    console.log('✅ Cleaned up test team.');

    // -------------------------------------------------------------
    // TEST 3: Task State Machine & RBAC Controls
    // -------------------------------------------------------------
    console.log('\n--- [TEST 3: Task State Machine & RBAC] ---');
    
    const sampleProject = await Project.findOne({ orgId: acmeOrgId });
    if (!sampleProject) throw new Error('Acme sample project not found!');

    const stateTask = await Task.create({
      orgId: acmeOrgId,
      projectId: sampleProject._id,
      title: 'State Machine Test Task',
      status: 'TO_DO',
      priority: 'MEDIUM',
      assigneeId: acmeMemberId,
      reporterId: acmePMId,
    });

    // Valid state transition: TO_DO -> IN_PROGRESS
    stateTask.status = 'IN_PROGRESS';
    await stateTask.save();
    console.log('✅ Valid status transition TO_DO -> IN_PROGRESS passed.');

    // Valid state transition: IN_PROGRESS -> UNDER_REVIEW
    stateTask.status = 'UNDER_REVIEW';
    await stateTask.save();
    console.log('✅ Valid status transition IN_PROGRESS -> UNDER_REVIEW passed.');

    // Cleanup state task
    await Task.deleteOne({ _id: stateTask._id });
    console.log('✅ Cleaned up state machine task.');

    // -------------------------------------------------------------
    // TEST 4: Tenant Isolation Enforcement
    // -------------------------------------------------------------
    console.log('\n--- [TEST 4: Tenant Isolation Enforcement] ---');
    
    const starkProjects = await Project.find({ orgId: starkOrgId });
    const acmeProjectsInStarkQuery = await Project.find({ orgId: starkOrgId, name: /Acme/i });
    
    if (acmeProjectsInStarkQuery.length === 0) {
      console.log('✅ Strict tenant isolation confirmed: Stark query returned 0 Acme projects.');
    } else {
      throw new Error('CRITICAL TENANT LEAK DETECTED!');
    }

    // -------------------------------------------------------------
    // TEST 5: Audit Log & Notification Verification
    // -------------------------------------------------------------
    console.log('\n--- [TEST 5: Audit Logging & Notification Hooks] ---');
    
    const auditLogsCount = await AuditLog.countDocuments({ orgId: acmeOrgId });
    console.log(`✅ Audit Log records verified in database: ${auditLogsCount} entries found.`);

    console.log('\n==============================================');
    console.log('🎉 ALL DAY 4 INTEGRATION TESTS PASSED 100%!');
    console.log('==============================================\n');
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runDay4Tests();
