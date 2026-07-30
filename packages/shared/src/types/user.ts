import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(32),
  displayName: z.string().min(1).max(64),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof UserSchema>;

export const RegisterInputSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9_.]+$/, "lowercase letters, numbers, underscore, dot only"),
  displayName: z.string().min(1).max(64),
  email: z.string().email(),
  password: z.string().min(8).max(256),
});
export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  emailOrUsername: z.string().min(1),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const UpdateMeInputSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});
export type UpdateMeInput = z.infer<typeof UpdateMeInputSchema>;
