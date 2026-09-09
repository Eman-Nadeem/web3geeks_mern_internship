import { prisma } from "./prisma";
import { CollaboratorRole, Prisma } from "@prisma/client";

export const DEMO_USER_ID = "user_demo_123";

export type AccessRole = "owner" | "editor" | "viewer" | "none";

export const VALID_STATUSES = ["Draft", "In Review", "Complete"] as const;
export type DocumentStatusType = (typeof VALID_STATUSES)[number];

export const VALID_CATEGORIES = [
  "Product",
  "Engineering",
  "Design",
  "Marketing",
  "Architecture",
  "General",
] as const;
export type DocumentCategoryType = (typeof VALID_CATEGORIES)[number];

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
      password: "",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=DemoArchitect",
    },
  });
}

/**
 * Single source of truth authorization helper.
 * Returns one of: "owner", "editor", "viewer", or "none".
 */
export async function getUserDocumentAccess(
  userId: string,
  documentId: string
): Promise<AccessRole> {
  if (!userId || !documentId) return "none";

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      ownerId: true,
      collaborators: {
        where: { userId },
        select: { role: true },
      },
    },
  });

  if (!doc) return "none";

  if (doc.ownerId === userId) {
    return "owner";
  }

  const collaboration = doc.collaborators[0];
  if (collaboration) {
    return collaboration.role === CollaboratorRole.viewer ? "viewer" : "editor";
  }

  return "none";
}

/**
 * Backwards compatibility check for Socket.IO join
 */
export async function canUserAccessDocument(
  documentId: string,
  userId: string
): Promise<boolean> {
  const access = await getUserDocumentAccess(userId, documentId);
  return access !== "none";
}

/**
 * Fetches all documents accessible by a user (both owned and shared),
 * ordered by most recently updated.
 */
export async function getAllDocuments(userId: string) {
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { collaborators: { some: { userId } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      jsonContent: true,
      status: true,
      category: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      collaborators: {
        select: {
          userId: true,
          role: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return documents.map((doc) => {
    let accessRole: AccessRole = "none";
    if (doc.ownerId === userId) {
      accessRole = "owner";
    } else {
      const col = doc.collaborators.find((c) => c.userId === userId);
      accessRole = col?.role === CollaboratorRole.viewer ? "viewer" : "editor";
    }

    return {
      ...doc,
      accessRole,
    };
  });
}

/**
 * Fetches a single document by ID with its owner and collaborator details.
 */
export async function getDocumentById(id: string) {
  return await prisma.document.findUnique({
    where: { id },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      collaborators: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Creates a new document owned by the specified user.
 */
export async function createDocument(
  ownerId: string,
  data?: {
    title?: string;
    content?: string;
    jsonContent?: string | null;
    status?: string;
    category?: string;
  }
) {
  let initialHtml = data?.content ?? "<p>Start typing your document here...</p>";
  const trimmed = initialHtml.trim();
  if (!trimmed.startsWith("<")) {
    initialHtml = trimmed
      .split(/\n+/)
      .map((para) => `<p>${para.trim()}</p>`)
      .join("");
  }

  return await prisma.document.create({
    data: {
      title: data?.title?.trim() || "Untitled Document",
      content: initialHtml,
      jsonContent: data?.jsonContent ?? null,
      status: data?.status || "Draft",
      category: data?.category || "General",
      ownerId,
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
      collaborators: true,
    },
  });
}

export type DocumentWithAuthor = Prisma.DocumentGetPayload<{
  include: {
    owner: {
      select: {
        id: true;
        name: true;
        email: true;
        avatarUrl: true;
      };
    };
  };
}>;

export type CollaboratorWithUser = Prisma.DocumentCollaboratorGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        email: true;
        avatarUrl: true;
      };
    };
  };
}>;

export type MutationResult<T> =
  | { success: true; data: T }
  | { success: false; status: 400 | 403 | 404; error: string };

/**
 * Updates an existing document. Allowed for owner and editor.
 * Rejected for viewers (403) and unauthorized users (403/404).
 */
export async function updateDocument(
  id: string,
  userId: string,
  data: {
    title?: string;
    content?: string;
    jsonContent?: string | null;
    status?: string;
    category?: string;
  }
): Promise<MutationResult<DocumentWithAuthor>> {
  const access = await getUserDocumentAccess(userId, id);

  if (access === "none") {
    return {
      success: false,
      status: 403,
      error: "You do not have permission to access this document",
    };
  }

  if (access === "viewer") {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Viewers have read-only access and cannot edit this document",
    };
  }

  const updatePayload: {
    title?: string;
    content?: string;
    jsonContent?: string | null;
    status?: string;
    category?: string;
  } = {};

  if (data.title !== undefined) {
    updatePayload.title = data.title.trim() || "Untitled Document";
  }
  if (data.content !== undefined) {
    let cleanContent = data.content.trim();
    if (cleanContent && !cleanContent.startsWith("<")) {
      cleanContent = cleanContent
        .split(/\n+/)
        .map((para) => `<p>${para.trim()}</p>`)
        .join("");
    }
    updatePayload.content = cleanContent;
  }
  if (data.jsonContent !== undefined) {
    updatePayload.jsonContent = data.jsonContent;
  }
  if (data.status !== undefined) {
    updatePayload.status = data.status;
  }
  if (data.category !== undefined) {
    updatePayload.category = data.category;
  }

  const updated = await prisma.document.update({
    where: { id },
    data: updatePayload,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return { success: true, data: updated };
}

/**
 * Deletes a document. Allowed for owner only.
 */
export async function deleteDocument(
  id: string,
  userId: string
): Promise<MutationResult<{ id: string }>> {
  const existing = await prisma.document.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });

  if (!existing) {
    return { success: false, status: 404, error: "Document not found" };
  }

  if (existing.ownerId !== userId) {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Only the document owner can delete this document",
    };
  }

  const deleted = await prisma.document.delete({
    where: { id },
  });

  return { success: true, data: { id: deleted.id } };
}

// --- Collaborator Management Functions ---

/**
 * Gets all collaborators for a document.
 */
export async function getDocumentCollaborators(documentId: string) {
  return await prisma.documentCollaborator.findMany({
    where: { documentId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { addedAt: "asc" },
  });
}

/**
 * Invites a collaborator by email. Owner-only action.
 */
export async function addDocumentCollaborator(
  documentId: string,
  email: string,
  role: "editor" | "viewer" = "editor",
  requesterId: string
): Promise<MutationResult<CollaboratorWithUser>> {
  const access = await getUserDocumentAccess(requesterId, documentId);
  if (access !== "owner") {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Only the document owner can manage collaborators",
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: { id: true, name: true, email: true, avatarUrl: true },
  });

  if (!targetUser) {
    return {
      success: false,
      status: 404,
      error: "No account found with this email. Ask them to sign up first.",
    };
  }

  if (targetUser.id === requesterId) {
    return {
      success: false,
      status: 400,
      error: "You are already the owner of this document.",
    };
  }

  const collaboratorRole =
    role === "viewer" ? CollaboratorRole.viewer : CollaboratorRole.editor;

  const collaboration = await prisma.documentCollaborator.upsert({
    where: {
      documentId_userId: {
        documentId,
        userId: targetUser.id,
      },
    },
    update: {
      role: collaboratorRole,
    },
    create: {
      documentId,
      userId: targetUser.id,
      role: collaboratorRole,
      addedById: requesterId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return { success: true, data: collaboration };
}

/**
 * Removes a collaborator. Owner-only action.
 */
export async function removeDocumentCollaborator(
  documentId: string,
  targetUserId: string,
  requesterId: string
): Promise<MutationResult<{ userId: string; documentId: string }>> {
  const access = await getUserDocumentAccess(requesterId, documentId);
  if (access !== "owner") {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Only the document owner can manage collaborators",
    };
  }

  try {
    await prisma.documentCollaborator.delete({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUserId,
        },
      },
    });

    return { success: true, data: { userId: targetUserId, documentId } };
  } catch {
    return {
      success: false,
      status: 404,
      error: "Collaborator not found on this document",
    };
  }
}

/**
 * Updates a collaborator's role (editor <-> viewer). Owner-only action.
 */
export async function updateCollaboratorRole(
  documentId: string,
  targetUserId: string,
  newRole: "editor" | "viewer",
  requesterId: string
): Promise<MutationResult<CollaboratorWithUser>> {
  const access = await getUserDocumentAccess(requesterId, documentId);
  if (access !== "owner") {
    return {
      success: false,
      status: 403,
      error: "Forbidden: Only the document owner can manage collaborators",
    };
  }

  const role =
    newRole === "viewer" ? CollaboratorRole.viewer : CollaboratorRole.editor;

  try {
    const updated = await prisma.documentCollaborator.update({
      where: {
        documentId_userId: {
          documentId,
          userId: targetUserId,
        },
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return { success: true, data: updated };
  } catch {
    return {
      success: false,
      status: 404,
      error: "Collaborator not found on this document",
    };
  }
}
