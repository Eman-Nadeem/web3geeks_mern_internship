import { z } from "zod";
import { ProjectStatus } from "@/types";

export const projectStatusSchema = z.nativeEnum(ProjectStatus);

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(120, "Project name cannot exceed 120 characters"),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional(),
  status: projectStatusSchema.optional().default(ProjectStatus.PLANNING),
  ownerId: z.string().uuid("Invalid owner ID").optional(),
});

export const updateProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Project name must be at least 2 characters")
    .max(120, "Project name cannot exceed 120 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Description cannot exceed 2000 characters")
    .nullable()
    .optional(),
  status: projectStatusSchema.optional(),
  ownerId: z.string().uuid("Invalid owner ID").optional(),
});

export const getProjectsQuerySchema = z.object({
  status: projectStatusSchema.optional(),
  search: z.string().trim().max(100).optional(),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type GetProjectsQuery = z.infer<typeof getProjectsQuerySchema>;
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
