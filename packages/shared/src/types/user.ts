import { z } from "zod";
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "../legal/index.js";

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(32),
  displayName: z.string().min(1).max(64),
  avatarUrl: z.string().url().nullable(),
  isBot: z.boolean(),
  showcasedServerId: z.string().uuid().nullable(),
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
  // DSGVO Art. 7: explicit, versioned consent captured at registration (see consent_records table).
  acceptedTermsVersion: z.literal(CURRENT_TERMS_VERSION),
  acceptedPrivacyVersion: z.literal(CURRENT_PRIVACY_VERSION),
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
  showcasedServerId: z.string().uuid().nullable().optional(),
});
export type UpdateMeInput = z.infer<typeof UpdateMeInputSchema>;
