import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

import { User } from '../models/User';
import { Organization } from '../models/Organization';

async function testSignup() {
  await mongoose.connect(process.env.MONGODB_URI || '');

  const orgSlug = `test-org-${Date.now()}`;
  const email = `testowner-${Date.now()}@example.com`;

  // Simulate POST /api/auth/signup
  const organization = await Organization.create({
    name: 'Test Org Auto Owner',
    slug: orgSlug,
    plan: 'FREE',
    status: 'ACTIVE',
  });

  const user = await User.create({
    orgId: organization._id,
    email: email.toLowerCase(),
    passwordHash: 'dummyhash',
    fullName: 'New Org Admin',
    role: 'OrgAdmin',
    status: 'ACTIVE',
  });

  organization.ownerId = user._id;
  await organization.save();

  const fetchedOrg = await Organization.findById(organization._id).populate('ownerId');
  const fetchedUser = await User.findById(user._id);

  console.log('CREATED ORG:', JSON.stringify(fetchedOrg, null, 2));
  console.log('CREATED USER:', JSON.stringify(fetchedUser, null, 2));

  await mongoose.disconnect();
}

testSignup().catch(console.error);
