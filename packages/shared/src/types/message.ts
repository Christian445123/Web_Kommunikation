import { z } from "zod";
import { MAX_MESSAGE_LENGTH_CEILING } from "../billing/index.js";

export const MessageSchema = z.object({
  id: z.string().uuid(),
  channelId: z.string().uuid(),
  authorId: z.string().uuid(),
  content: z.string().nullable(), // null when isEncrypted channel (Phase 2)
  replyToId: z.string().uuid().nullable(),
  editedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type Message = z.infer<typeof MessageSchema>;

export const CreateMessageInputSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH_CEILING),
  replyToId: z.string().uuid().nullable().optional(),
});
export type CreateMessageInput = z.infer<typeof CreateMessageInputSchema>;

export const UpdateMessageInputSchema = z.object({
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH_CEILING),
});
export type UpdateMessageInput = z.infer<typeof UpdateMessageInputSchema>;

export const MessagePageQuerySchema = z.object({
  before: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type MessagePageQuery = z.infer<typeof MessagePageQuerySchema>;
