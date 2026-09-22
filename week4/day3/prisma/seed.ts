import { PrismaClient, Role, InvitationStatus, ProjectStatus, TaskStatus, TaskPriority } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.warn("Skipping seed execution in production environment.");
    return;
  }

  console.log("Starting database seeding...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  // 1. Create Users
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {
      name: "Alice Johnson",
      password: passwordHash,
    },
    create: {
      email: "alice@example.com",
      name: "Alice Johnson",
      password: passwordHash,
      avatar: null,
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.com" },
    update: {
      name: "Bob Smith",
      password: passwordHash,
    },
    create: {
      email: "bob@example.com",
      name: "Bob Smith",
      password: passwordHash,
      avatar: null,
    },
  });

  const carol = await prisma.user.upsert({
    where: { email: "carol@example.com" },
    update: {
      name: "Carol Williams",
      password: passwordHash,
    },
    create: {
      email: "carol@example.com",
      name: "Carol Williams",
      password: passwordHash,
      avatar: null,
    },
  });

  const david = await prisma.user.upsert({
    where: { email: "david@example.com" },
    update: {
      name: "David Miller",
      password: passwordHash,
    },
    create: {
      email: "david@example.com",
      name: "David Miller",
      password: passwordHash,
      avatar: null,
    },
  });

  console.log(`Created/Verified users: ${alice.email}, ${bob.email}, ${carol.email}, ${david.email}`);

  // 2. Create Organizations and Memberships
  // Organization 1: Acme Corp (Owner: Alice)
  let acme = await prisma.organization.findUnique({
    where: { slug: "acme-corp" },
  });

  if (!acme) {
    acme = await prisma.organization.create({
      data: {
        name: "Acme Corp",
        slug: "acme-corp",
        description: "Leading innovator in next-generation cloud infrastructure.",
        logoUrl: null,
        ownerId: alice.id,
      },
    });
  } else {
    acme = await prisma.organization.update({
      where: { id: acme.id },
      data: {
        description: "Leading innovator in next-generation cloud infrastructure.",
      },
    });
  }

  // Memberships for Acme Corp
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: alice.id,
        organizationId: acme.id,
      },
    },
    update: { role: Role.OWNER },
    create: {
      userId: alice.id,
      organizationId: acme.id,
      role: Role.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: bob.id,
        organizationId: acme.id,
      },
    },
    update: { role: Role.ADMIN },
    create: {
      userId: bob.id,
      organizationId: acme.id,
      role: Role.ADMIN,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: carol.id,
        organizationId: acme.id,
      },
    },
    update: { role: Role.MEMBER },
    create: {
      userId: carol.id,
      organizationId: acme.id,
      role: Role.MEMBER,
    },
  });

  // Organization 2: Startup Labs (Owner: Bob)
  let startupLabs = await prisma.organization.findUnique({
    where: { slug: "startup-labs" },
  });

  if (!startupLabs) {
    startupLabs = await prisma.organization.create({
      data: {
        name: "Startup Labs",
        slug: "startup-labs",
        description: "Collaborative incubator for early-stage engineering teams.",
        logoUrl: null,
        ownerId: bob.id,
      },
    });
  } else {
    startupLabs = await prisma.organization.update({
      where: { id: startupLabs.id },
      data: {
        description: "Collaborative incubator for early-stage engineering teams.",
      },
    });
  }

  // Memberships for Startup Labs
  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: bob.id,
        organizationId: startupLabs.id,
      },
    },
    update: { role: Role.OWNER },
    create: {
      userId: bob.id,
      organizationId: startupLabs.id,
      role: Role.OWNER,
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: alice.id,
        organizationId: startupLabs.id,
      },
    },
    update: { role: Role.MEMBER },
    create: {
      userId: alice.id,
      organizationId: startupLabs.id,
      role: Role.MEMBER,
    },
  });

  // 3. Seed Invitations for Manual Testing
  const seedToken = "seed-test-invitation-token-12345";
  const seedTokenHash = hashToken(seedToken);

  const existingSeedInvite = await prisma.invitation.findUnique({
    where: { token: seedTokenHash },
  });

  if (!existingSeedInvite) {
    await prisma.invitation.create({
      data: {
        email: "david@example.com",
        organizationId: acme.id,
        role: Role.MEMBER,
        token: seedTokenHash,
        status: InvitationStatus.PENDING,
        invitedById: alice.id,
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      },
    });
    console.log(`Created seed pending invitation for david@example.com (Raw token: ${seedToken})`);
    console.log(`Invite link: http://localhost:3000/invitations/${seedToken}`);
  }

  // 4. Seed Day 3 Projects & Tasks
  console.log("Seeding Projects and Tasks...");

  // Project 1: Acme Platform Redesign (Active, owned by Alice)
  let projPlatform = await prisma.project.findFirst({
    where: { organizationId: acme.id, name: "Platform Redesign" },
  });
  if (!projPlatform) {
    projPlatform = await prisma.project.create({
      data: {
        organizationId: acme.id,
        name: "Platform Redesign",
        description: "Core UI/UX revamp with Next.js App Router and unified design system.",
        status: ProjectStatus.ACTIVE,
        ownerId: alice.id,
        createdById: alice.id,
      },
    });
  }

  // Project 2: Security & SOC2 Compliance (Planning, owned by Bob)
  let projSecurity = await prisma.project.findFirst({
    where: { organizationId: acme.id, name: "Security & SOC2 Audit" },
  });
  if (!projSecurity) {
    projSecurity = await prisma.project.create({
      data: {
        organizationId: acme.id,
        name: "Security & SOC2 Audit",
        description: "Organization-wide security hardening and audit trail verification.",
        status: ProjectStatus.PLANNING,
        ownerId: bob.id,
        createdById: alice.id,
      },
    });
  }

  // Project 3: Startup Labs Mobile MVP
  let projMobile = await prisma.project.findFirst({
    where: { organizationId: startupLabs.id, name: "Mobile App MVP" },
  });
  if (!projMobile) {
    projMobile = await prisma.project.create({
      data: {
        organizationId: startupLabs.id,
        name: "Mobile App MVP",
        description: "Cross-platform React Native client for early customer feedback.",
        status: ProjectStatus.ACTIVE,
        ownerId: bob.id,
        createdById: bob.id,
      },
    });
  }

  // Project Members
  // For Platform Redesign: Bob and Carol
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projPlatform.id, userId: bob.id } },
    update: {},
    create: {
      projectId: projPlatform.id,
      userId: bob.id,
      addedById: alice.id,
    },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projPlatform.id, userId: carol.id } },
    update: {},
    create: {
      projectId: projPlatform.id,
      userId: carol.id,
      addedById: alice.id,
    },
  });

  // For Security Audit: Alice and Carol
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projSecurity.id, userId: alice.id } },
    update: {},
    create: {
      projectId: projSecurity.id,
      userId: alice.id,
      addedById: bob.id,
    },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projSecurity.id, userId: carol.id } },
    update: {},
    create: {
      projectId: projSecurity.id,
      userId: carol.id,
      addedById: bob.id,
    },
  });

  // For Mobile MVP: Alice
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId: projMobile.id, userId: alice.id } },
    update: {},
    create: {
      projectId: projMobile.id,
      userId: alice.id,
      addedById: bob.id,
    },
  });

  // Tasks for Platform Redesign
  const platformTasks = [
    {
      title: "Set up design tokens & dark mode color variables",
      description: "Ensure Tailwind tokens align with modern HSL palettes.",
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      assigneeId: alice.id,
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Audit deprecated legacy API routes",
      description: "Critical cleanup of v1 endpoints before migration cutover.",
      status: TaskStatus.TODO,
      priority: TaskPriority.URGENT,
      assigneeId: bob.id,
      dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // OVERDUE
      completedAt: null,
    },
    {
      title: "Implement reusable task table component",
      description: "Support sorting, filtering, and inline status dropdowns.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      assigneeId: carol.id,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      completedAt: null,
    },
    {
      title: "Conduct accessibility testing across navigation bars",
      description: "Keyboard navigation and screen reader aria labels.",
      status: TaskStatus.REVIEW,
      priority: TaskPriority.MEDIUM,
      assigneeId: alice.id,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      completedAt: null,
    },
    {
      title: "Create project dashboard metrics query",
      description: "Aggregate counts via Prisma groupBy for fast response times.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: bob.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      completedAt: null,
    },
    {
      title: "Benchmark database queries on 10k mock tasks",
      description: "Verify index performance on (projectId, status) and (projectId, dueDate).",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      assigneeId: null,
      dueDate: null,
      completedAt: null,
    },
    {
      title: "Draft project release documentation",
      description: "Release notes for stakeholders and beta testing instructions.",
      status: TaskStatus.TODO,
      priority: TaskPriority.LOW,
      assigneeId: carol.id,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      completedAt: null,
    },
    {
      title: "Configure automated Vitest coverage reporter",
      description: "Ensure test coverage threshold is maintained at >= 90%.",
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.MEDIUM,
      assigneeId: alice.id,
      dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const t of platformTasks) {
    const existing = await prisma.task.findFirst({
      where: { projectId: projPlatform.id, title: t.title },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          ...t,
          projectId: projPlatform.id,
          createdById: alice.id,
        },
      });
    }
  }

  // Tasks for Security & SOC2 Audit
  const securityTasks = [
    {
      title: "Enforce rotation on JWT signing keys",
      description: "Ensure secret rollover without terminating active sessions.",
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.URGENT,
      assigneeId: bob.id,
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // OVERDUE
      completedAt: null,
    },
    {
      title: "Configure IP rate limiting headers in production",
      description: "Prevent brute-force authentication attacks on login routes.",
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.HIGH,
      assigneeId: alice.id,
      dueDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      title: "Review multi-tenant IDOR tests for projects and tasks",
      description: "Verify that requests to foreign org or foreign project return 404.",
      status: TaskStatus.REVIEW,
      priority: TaskPriority.HIGH,
      assigneeId: carol.id,
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      completedAt: null,
    },
    {
      title: "Export database backup snapshot to cold storage",
      description: "Daily automated snapshot verification for disaster recovery.",
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      assigneeId: null,
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      completedAt: null,
    },
  ];

  for (const t of securityTasks) {
    const existing = await prisma.task.findFirst({
      where: { projectId: projSecurity.id, title: t.title },
    });
    if (!existing) {
      await prisma.task.create({
        data: {
          ...t,
          projectId: projSecurity.id,
          createdById: bob.id,
        },
      });
    }
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
