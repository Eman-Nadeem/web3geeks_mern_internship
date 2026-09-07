import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z
    .string()
    .max(255, { message: "Title cannot exceed 255 characters" })
    .optional()
    .default("Untitled Document"),
  content: z.string().optional().default("<p>Start typing your document here...</p>"),
  jsonContent: z.string().optional().nullable(),
});

export const updateDocumentSchema = z.object({
  title: z
    .string()
    .max(255, { message: "Title cannot exceed 255 characters" })
    .optional(),
  content: z.string().optional(),
  jsonContent: z.string().optional().nullable(),
});

export const documentIdSchema = z.object({
  id: z.string().min(1, { message: "Document ID is required" }),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
