import { prisma } from "./prisma";

export const DEMO_USER_ID = "user_demo_123";

/**
 * Ensures the default demo user exists in the database.
 */
export async function ensureDemoUser() {
  return await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {},
    create: {
      id: DEMO_USER_ID,
      email: "demo@example.com",
      name: "Demo Architect",
    },
  });
}

/**
 * Fetches all documents owned by a user, ordered by most recently updated.
 */
export async function getAllDocuments(ownerId: string = DEMO_USER_ID) {
  await ensureDemoUser();
  return await prisma.document.findMany({
    where: { ownerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Fetches a single document by ID for a specific user.
 */
export async function getDocumentById(id: string, ownerId: string = DEMO_USER_ID) {
  await ensureDemoUser();
  return await prisma.document.findFirst({
    where: { id, ownerId },
  });
}

/**
 * Creates a new document with default or provided title/content.
 */
export async function createDocument(
  ownerId: string = DEMO_USER_ID,
  data?: { title?: string; content?: string; jsonContent?: string | null }
) {
  await ensureDemoUser();
  return await prisma.document.create({
    data: {
      title: data?.title?.trim() || "Untitled Document",
      content: data?.content ?? "<p>Start typing your document here...</p>",
      jsonContent: data?.jsonContent ?? null,
      ownerId,
    },
  });
}

/**
 * Updates an existing document's title and/or content.
 */
export async function updateDocument(
  id: string,
  ownerId: string = DEMO_USER_ID,
  data: { title?: string; content?: string; jsonContent?: string | null }
) {
  await ensureDemoUser();

  const existing = await getDocumentById(id, ownerId);
  if (!existing) {
    return null;
  }

  const updatePayload: { title?: string; content?: string; jsonContent?: string | null } = {};

  if (data.title !== undefined) {
    updatePayload.title = data.title.trim() || "Untitled Document";
  }
  if (data.content !== undefined) {
    updatePayload.content = data.content;
  }
  if (data.jsonContent !== undefined) {
    updatePayload.jsonContent = data.jsonContent;
  }

  return await prisma.document.update({
    where: { id },
    data: updatePayload,
  });
}

/**
 * Deletes a document by ID.
 */
export async function deleteDocument(id: string, ownerId: string = DEMO_USER_ID) {
  await ensureDemoUser();

  const existing = await getDocumentById(id, ownerId);
  if (!existing) {
    return null;
  }

  return await prisma.document.delete({
    where: { id },
  });
}
