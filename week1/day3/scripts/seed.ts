import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

import { Organization } from '../models/Organization';
import { User } from '../models/User';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { Team } from '../models/Team';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

async function seedDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('CRITICAL: MONGODB_URI is not defined in .env.local or .env.example');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas for seeding...');
  await mongoose.connect(uri);
  console.log('Connected successfully!');

  try {
    console.log('Clearing existing data...');
    await Promise.all([
      Organization.deleteMany({}),
      User.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Team.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash('Password123!', 10);

    // 1. Create Super Admin
    console.log('Creating Super Admin account...');
    const superAdmin = await User.create({
      fullName: 'Global Super Admin',
      email: 'superadmin@system.com',
      passwordHash,
      role: 'SuperAdmin',
      status: 'ACTIVE',
    });

    // 2. Create Organization 1: Acme Corp
    console.log('Seeding Tenant 1: Acme Corp...');
    const acmeOrg = await Organization.create({
      name: 'Acme Corp',
      slug: 'acme-corp',
      plan: 'PRO',
      status: 'ACTIVE',
    });

    const acmeAdmin = await User.create({
      orgId: acmeOrg._id,
      fullName: 'Alice Acme (Admin)',
      email: 'admin@acme.com',
      passwordHash,
      role: 'OrgAdmin',
      status: 'ACTIVE',
    });

    acmeOrg.ownerId = acmeAdmin._id;
    await acmeOrg.save();

    const acmePM = await User.create({
      orgId: acmeOrg._id,
      fullName: 'Bob Acme (Project Manager)',
      email: 'pm@acme.com',
      passwordHash,
      role: 'ProjectManager',
      status: 'ACTIVE',
    });

    const acmeMember = await User.create({
      orgId: acmeOrg._id,
      fullName: 'Charlie Acme (Developer)',
      email: 'member@acme.com',
      passwordHash,
      role: 'TeamMember',
      status: 'ACTIVE',
    });

    const acmeTeam = await Team.create({
      orgId: acmeOrg._id,
      name: 'Frontend Guild',
      description: 'Acme Web Development Team',
      leaderId: acmePM._id,
      memberIds: [acmeMember._id],
    });

    const acmeProject = await Project.create({
      orgId: acmeOrg._id,
      name: 'Acme SaaS Dashboard Redesign',
      description: 'Revamping the core customer portal interface.',
      status: 'ACTIVE',
      managerId: acmePM._id,
      teamId: acmeTeam._id,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    const acmeTask1 = await Task.create({
      orgId: acmeOrg._id,
      projectId: acmeProject._id,
      title: 'Design Dark Mode Wireframes',
      description: 'Create Figma prototypes for dashboard analytics.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assigneeId: acmeMember._id,
      reporterId: acmePM._id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await Notification.create({
      orgId: acmeOrg._id,
      userId: acmeMember._id,
      title: 'Task Assigned',
      message: 'You have been assigned to task: Design Dark Mode Wireframes',
      type: 'TASK_ASSIGNED',
      isRead: false,
    });

    await AuditLog.create({
      orgId: acmeOrg._id,
      actorId: acmeAdmin._id,
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: acmeOrg._id,
      details: { name: acmeOrg.name, plan: acmeOrg.plan },
    });

    // 3. Create Organization 2: Stark Industries
    console.log('Seeding Tenant 2: Stark Industries...');
    const starkOrg = await Organization.create({
      name: 'Stark Industries',
      slug: 'stark-industries',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
    });

    const starkAdmin = await User.create({
      orgId: starkOrg._id,
      fullName: 'Tony Stark (Admin)',
      email: 'admin@stark.com',
      passwordHash,
      role: 'OrgAdmin',
      status: 'ACTIVE',
    });

    starkOrg.ownerId = starkAdmin._id;
    await starkOrg.save();

    const starkPM = await User.create({
      orgId: starkOrg._id,
      fullName: 'Pepper Potts (Project Manager)',
      email: 'pm@stark.com',
      passwordHash,
      role: 'ProjectManager',
      status: 'ACTIVE',
    });

    const starkMember = await User.create({
      orgId: starkOrg._id,
      fullName: 'Peter Parker (Engineer)',
      email: 'member@stark.com',
      passwordHash,
      role: 'TeamMember',
      status: 'ACTIVE',
    });

    const starkProject = await Project.create({
      orgId: starkOrg._id,
      name: 'Mark L Defense Armor',
      description: 'Nanotech deployment systems.',
      status: 'ACTIVE',
      managerId: starkPM._id,
      startDate: new Date(),
    });

    await Task.create({
      orgId: starkOrg._id,
      projectId: starkProject._id,
      title: 'Calibrate Arc Reactor Telemetry',
      description: 'Ensure power output stability under load.',
      status: 'TO_DO',
      priority: 'URGENT',
      assigneeId: starkMember._id,
      reporterId: starkPM._id,
    });

    console.log('\n==============================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('==============================================');
    console.log(`- Created 2 Organizations: Acme Corp, Stark Industries`);
    console.log(`- Created 7 Users (SuperAdmin, OrgAdmins, PMs, Members)`);
    console.log(`- Created Projects, Tasks, Teams, Notifications, Audit Logs`);
    console.log(`- Default Login Password for seeded users: Password123!`);
    console.log('==============================================\n');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
  }
}

seedDatabase();
