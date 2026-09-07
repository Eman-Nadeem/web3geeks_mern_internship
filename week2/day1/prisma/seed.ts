import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Ensure default demo user exists
  const demoUser = await prisma.user.upsert({
    where: { id: "user_demo_123" },
    update: {},
    create: {
      id: "user_demo_123",
      email: "demo@example.com",
      name: "Demo Architect",
    },
  });

  console.log("Demo user ensured:", demoUser.id);

  // 2. Create sample documents if user has none
  const existingDocsCount = await prisma.document.count({
    where: { ownerId: demoUser.id },
  });

  if (existingDocsCount === 0) {
    const doc1 = await prisma.document.create({
      data: {
        title: "Welcome to Collaborative Docs",
        content: `<h2>Getting Started</h2><p>This is your single-user persistent document editor foundation built with <strong>Next.js 15+ App Router</strong> and <strong>Tiptap</strong>.</p><p>Features included on Day 1:</p><ul><li>Instant document creation & auto-save</li><li>Debounced title and content updates</li><li>Swagger OpenAPI 3.0 interactive documentation</li><li>Zod input contract validation</li></ul><p>Ready for real-time Yjs CRDT collaboration on Day 2+!</p>`,
        ownerId: demoUser.id,
      },
    });

    const doc2 = await prisma.document.create({
      data: {
        title: "Architecture & System Notes",
        content: `<h2>System Architecture Blueprint</h2><p>Our database layer is managed by <strong>Prisma ORM</strong> with serverless connection pooling patterns.</p><blockquote>ProseMirror nodes stored as HTML & structured JSON ensure 100% backward-compatible upgrades when WebSockets and Yjs CRDT operational deltas attach.</blockquote>`,
        ownerId: demoUser.id,
      },
    });

    console.log("Created initial documents:", doc1.id, doc2.id);
  } else {
    console.log(`Database already has ${existingDocsCount} document(s). Skipping seed creation.`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
