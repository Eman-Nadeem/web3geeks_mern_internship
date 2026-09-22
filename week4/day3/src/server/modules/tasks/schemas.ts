import { z } from "zod";
import { TaskStatus, TaskPriority } from "@/types";

export const taskStatusSchema = z.nativeEnum(TaskStatus);
export const taskPrioritySchema = z.nativeEnum(TaskPriority);

export const createTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Task title must be at least 2 characters")
    .max(200, "Task title cannot exceed 200 characters"),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable()
    .optional(),
  status: taskStatusSchema.optional().default(TaskStatus.TODO),
  priority: taskPrioritySchema.optional().default(TaskPriority.MEDIUM),
  assigneeId: z.string().uuid("Invalid assignee ID").nullable().optional(),
  dueDate: z
    .string()
    .datetime({ message: "Due date must be a valid ISO date string" })
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export const updateTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Task title must be at least 2 characters")
    .max(200, "Task title cannot exceed 200 characters")
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description cannot exceed 5000 characters")
    .nullable()
    .optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().uuid("Invalid assignee ID").nullable().optional(),
  dueDate: z
    .string()
    .datetime({ message: "Due date must be a valid ISO date string" })
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export const getTasksQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  assigneeId: z.string().trim().optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  overdue: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((val) => val === "true" || val === true),
  sort: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(25),
  projectId: z.string().uuid("Invalid project ID").optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type GetTasksQuery = z.infer<typeof getTasksQuerySchema>;
