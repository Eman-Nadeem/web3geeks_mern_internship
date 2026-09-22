import { z } from "zod";

export const createInvitationSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .email("Please provide a valid email address")
    .transform((val) => val.toLowerCase().trim()),
  role: z.enum(["ADMIN", "MEMBER"], {
    errorMap: () => ({ message: "Role must be ADMIN or MEMBER" }),
  }),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;

export const invitationTokenParamSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});
