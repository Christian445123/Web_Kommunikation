import { z } from "zod";

// Never includes the token itself - only returned once, at creation/regeneration time.
export const BotApplicationSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  botUserId: z.string().uuid(),
  name: z.string().min(1).max(64),
  description: z.string().max(512).nullable(),
  iconUrl: z.string().url().nullable(),
  tokenLastFour: z.string(),
  disabledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type BotApplication = z.infer<typeof BotApplicationSchema>;

export const CreateBotApplicationInputSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(512).nullable().optional(),
});
export type CreateBotApplicationInput = z.infer<typeof CreateBotApplicationInputSchema>;

export const BotTokenResponseSchema = z.object({
  token: z.string(),
});
export type BotTokenResponse = z.infer<typeof BotTokenResponseSchema>;

export const InviteBotInputSchema = z.object({
  serverId: z.string().uuid(),
  permissions: z.string(), // bigint serialized as string
});
export type InviteBotInput = z.infer<typeof InviteBotInputSchema>;
