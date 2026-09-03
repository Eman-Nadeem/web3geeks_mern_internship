import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.example') });
}

import mongoose from 'mongoose';
import connectToDatabase from '../lib/db';
import User from '../models/User';
import Organization from '../models/Organization';
import { hashPassword, comparePassword, signAccessToken, verifyToken } from '../lib/auth';
import { hasPermission } from '../lib/rbac';
import { withTenant } from '../lib/tenantScoping';

let testPassedCount = 0;
let testFailedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    testPassedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    testFailedCount++;
  }
}

async function runAuthTests() {
  console.log('\n==================================================');
  console.log('🧪 DAY 3: MULTI-TENANT AUTH & RBAC INTEGRATION TESTS');
  console.log('==================================================\n');

  try {
    await connectToDatabase();
    console.log('Connected to database successfully.\n');

    // TEST SUITE 1: Password Hashing & Verification
    console.log('--- TEST SUITE 1: Password Security & Hashing ---');
    const rawPassword = 'SecurePassword123!';
    const passwordHash = await hashPassword(rawPassword);
    
    assert(passwordHash !== rawPassword, 'Password is properly hashed with bcrypt');
    assert(await comparePassword(rawPassword, passwordHash), 'Correct password verifies successfully');
    assert(!(await comparePassword('WrongPassword', passwordHash)), 'Incorrect password fails verification');

    // TEST SUITE 2: JWT Access & Refresh Token Issuance
    console.log('\n--- TEST SUITE 2: JWT Issuance & Payload Claims ---');
    const dummyPayload = {
      userId: new mongoose.Types.ObjectId().toString(),
      orgId: new mongoose.Types.ObjectId().toString(),
      email: 'testuser@acme.com',
      role: 'OrgAdmin' as const,
    };

    const token = await signAccessToken(dummyPayload);
    assert(typeof token === 'string' && token.length > 20, 'JWT Access Token generated');

    const decoded = await verifyToken(token);
    assert(decoded !== null, 'JWT Token signature verified successfully');
    assert(decoded?.userId === dummyPayload.userId, 'JWT Payload contains correct userId');
    assert(decoded?.orgId === dummyPayload.orgId, 'JWT Payload contains correct orgId');
    assert(decoded?.role === 'OrgAdmin', 'JWT Payload contains correct role');

    // TEST SUITE 3: RBAC Roles & Permissions Matrix
    console.log('\n--- TEST SUITE 3: RBAC Role & Permission Enforcer ---');
    assert(hasPermission('OrgAdmin', 'USER_MANAGE'), 'OrgAdmin possesses USER_MANAGE permission');
    assert(hasPermission('OrgAdmin', 'PROJECT_CREATE'), 'OrgAdmin possesses PROJECT_CREATE permission');
    assert(!hasPermission('TeamMember', 'USER_MANAGE'), 'TeamMember is DENIED USER_MANAGE permission');
    assert(!hasPermission('TeamMember', 'PROJECT_DELETE'), 'TeamMember is DENIED PROJECT_DELETE permission');
    assert(hasPermission('TeamMember', 'TASK_READ'), 'TeamMember possesses TASK_READ permission');

    // TEST SUITE 4: Multi-Tenant Data Isolation (withTenant Query Scoping)
    console.log('\n--- TEST SUITE 4: Tenant Data Isolation ---');
    const orgIdA = new mongoose.Types.ObjectId();
    const orgIdB = new mongoose.Types.ObjectId();

    const queryA = withTenant({ status: 'ACTIVE' }, orgIdA);
    const queryB = withTenant({ status: 'ACTIVE' }, orgIdB);

    assert(queryA.orgId.toString() === orgIdA.toString(), 'Query A scoped exclusively to Tenant Org A');
    assert(queryB.orgId.toString() === orgIdB.toString(), 'Query B scoped exclusively to Tenant Org B');
    assert(queryA.orgId.toString() !== queryB.orgId.toString(), 'Tenant Org A cannot match Tenant Org B context');

    // TEST SUITE 5: Organization Signup & Tenant Bootstrapping
    console.log('\n--- TEST SUITE 5: Signup & Tenant Bootstrapping ---');
    const testSlug = `test-org-${Date.now()}`;
    const testEmail = `admin-${Date.now()}@testorg.com`;

    const newOrg = await Organization.create({
      name: 'Test Automation Org',
      slug: testSlug,
      plan: 'PRO',
      status: 'ACTIVE',
    });

    const newAdmin = await User.create({
      orgId: newOrg._id,
      fullName: 'Test Admin User',
      email: testEmail,
      passwordHash: await hashPassword('Password123!'),
      role: 'OrgAdmin',
      status: 'ACTIVE',
    });

    newOrg.ownerId = newAdmin._id;
    await newOrg.save();

    assert(newOrg._id !== undefined, 'New Organization created successfully');
    assert(newAdmin.orgId?.toString() === newOrg._id.toString(), 'New User linked to correct Organization orgId');
    assert(newAdmin.role === 'OrgAdmin', 'New Tenant Creator assigned OrgAdmin role');

    // TEST SUITE 6: User Authentication & Login Flow
    console.log('\n--- TEST SUITE 6: User Authentication & Login ---');
    const fetchedUser = await User.findOne({ email: testEmail });
    assert(fetchedUser !== null, 'User found in database by email');
    
    if (fetchedUser) {
      const isValid = await comparePassword('Password123!', fetchedUser.passwordHash);
      assert(isValid, 'User credential login verification passed');
    }

    // Cleanup test records
    await User.deleteMany({ email: testEmail });
    await Organization.deleteMany({ slug: testSlug });

    console.log('\n==================================================');
    console.log(`RESULTS: ${testPassedCount} PASSED, ${testFailedCount} FAILED`);
    console.log('==================================================\n');

    if (testFailedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Test Suite encountered unhandled error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runAuthTests();
