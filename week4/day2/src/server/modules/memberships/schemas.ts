import { z } from "zod";
import { Role } from "@/types";

export const getMembersQuerySchema = z.object({
  search: z.string().trim().optional(),
  role: z.nativeEnum(Role).optional(),
});

export type GetMembersQuery = z.infer<typeof getMembersQuerySchema>;
