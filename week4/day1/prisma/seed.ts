import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  console.log(`Created/Verified users: ${alice.email}, ${bob.email}, ${carol.email}`);

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
        ownerId: alice.id,
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
        ownerId: bob.id,
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
