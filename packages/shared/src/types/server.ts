import { z } from "zod";

export const ServerSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  iconUrl: z.string().url().nullable(),
  ownerId: z.string().uuid(),
  createdAt: z.string().datetime(),
});
export type Server = z.infer<typeof ServerSchema>;

export const ServerMemberSchema = z.object({
  serverId: z.string().uuid(),
  userId: z.string().uuid(),
  nickname: z.string().max(64).nullable(),
  joinedAt: z.string().datetime(),
  roleIds: z.array(z.string().uuid()),
});
export type ServerMember = z.infer<typeof ServerMemberSchema>;

export const CreateServerInputSchema = z.object({
  name: z.string().min(1).max(100),
  iconUrl: z.string().url().nullable().optional(),
});
export type CreateServerInput = z.infer<typeof CreateServerInputSchema>;

export const UpdateServerInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  iconUrl: z.string().url().nullable().optional(),
});
export type UpdateServerInput = z.infer<typeof UpdateServerInputSchema>;

export const InviteSchema = z.object({
  code: z.string(),
  serverId: z.string().uuid(),
  createdBy: z.string().uuid(),
  expiresAt: z.string().datetime().nullable(),
  maxUses: z.number().int().nullable(),
  uses: z.number().int(),
});
export type Invite = z.infer<typeof InviteSchema>;
