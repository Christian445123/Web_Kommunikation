import { z } from "zod";

export const ChannelTypeSchema = z.enum(["text", "voice", "dm", "group_dm"]);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

export const ChannelSchema = z.object({
  id: z.string().uuid(),
  serverId: z.string().uuid().nullable(),
  name: z.string().max(100).nullable(),
  type: ChannelTypeSchema,
  topic: z.string().max(1024).nullable(),
  position: z.number().int(),
  isEncrypted: z.boolean(),
  createdAt: z.string().datetime(),
});
export type Channel = z.infer<typeof ChannelSchema>;

export const CreateChannelInputSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["text", "voice"]),
  topic: z.string().max(1024).nullable().optional(),
});
export type CreateChannelInput = z.infer<typeof CreateChannelInputSchema>;

export const UpdateChannelInputSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  topic: z.string().max(1024).nullable().optional(),
  position: z.number().int().optional(),
});
export type UpdateChannelInput = z.infer<typeof UpdateChannelInputSchema>;

export const PermissionOverwriteSchema = z.object({
  channelId: z.string().uuid(),
  targetType: z.enum(["role", "user"]),
  targetId: z.string().uuid(),
  allow: z.string(),
  deny: z.string(),
});
export type PermissionOverwrite = z.infer<typeof PermissionOverwriteSchema>;
