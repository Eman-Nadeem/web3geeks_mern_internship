import { z } from "zod";

export const CreateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(5000, "Comment too long"),
});

export const UpdateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(5000, "Comment too long"),
});

export const ListCommentsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type ListCommentsQuery = z.infer<typeof ListCommentsQuerySchema>;
