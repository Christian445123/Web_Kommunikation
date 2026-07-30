import { z } from "zod";
import type { Channel, Message, Role, Server, ServerMember, User } from "../types/index.js";

/**
 * Gateway wire protocol. Envelope shape is shared by both directions;
 * `op` disambiguates. Client -> server frames are validated with zod
 * (untrusted input). Server -> client dispatch payloads are plain TS
 * types (server-generated, no need to re-validate on the way out).
 */

// ---- Client -> Server frames (validated) ----

export const IdentifyFrameSchema = z.object({
  op: z.literal("IDENTIFY"),
  token: z.string().min(1),
});
export type IdentifyFrame = z.infer<typeof IdentifyFrameSchema>;

export const HeartbeatFrameSchema = z.object({ op: z.literal("HEARTBEAT") });
export type HeartbeatFrame = z.infer<typeof HeartbeatFrameSchema>;

export const MessageSendFrameSchema = z.object({
  op: z.literal("MESSAGE_SEND"),
  d: z.object({
    channelId: z.string().uuid(),
    content: z.string().min(1).max(4000),
    replyToId: z.string().uuid().nullable().optional(),
    nonce: z.string().optional(), // client-generated id for optimistic-UI reconciliation
  }),
});
export type MessageSendFrame = z.infer<typeof MessageSendFrameSchema>;

export const TypingStartFrameSchema = z.object({
  op: z.literal("TYPING_START"),
  d: z.object({ channelId: z.string().uuid() }),
});
export type TypingStartFrame = z.infer<typeof TypingStartFrameSchema>;

export const ClientFrameSchema = z.discriminatedUnion("op", [
  IdentifyFrameSchema,
  HeartbeatFrameSchema,
  MessageSendFrameSchema,
  TypingStartFrameSchema,
]);
export type ClientFrame = z.infer<typeof ClientFrameSchema>;

// ---- Server -> Client frames ----

export interface ReadyFrame {
  op: "READY";
  d: { user: User; servers: Server[] };
}

export interface HeartbeatAckFrame {
  op: "HEARTBEAT_ACK";
}

export interface ErrorFrame {
  op: "ERROR";
  d: { message: string; code?: string };
}

export type PresenceStatus = "online" | "idle" | "offline";

export interface DispatchPayloadMap {
  MESSAGE_CREATE: { message: Message; nonce?: string };
  MESSAGE_UPDATE: { message: Message };
  MESSAGE_DELETE: { channelId: string; messageId: string };
  TYPING_START: { channelId: string; userId: string };
  PRESENCE_UPDATE: { userId: string; status: PresenceStatus };
  CHANNEL_CREATE: { channel: Channel };
  CHANNEL_UPDATE: { channel: Channel };
  CHANNEL_DELETE: { serverId: string | null; channelId: string };
  SERVER_UPDATE: { server: Server };
  SERVER_MEMBER_ADD: { serverId: string; member: ServerMember };
  SERVER_MEMBER_REMOVE: { serverId: string; userId: string };
  SERVER_MEMBER_UPDATE: { serverId: string; member: ServerMember };
  ROLE_CREATE: { serverId: string; role: Role };
  ROLE_UPDATE: { serverId: string; role: Role };
  ROLE_DELETE: { serverId: string; roleId: string };
}

export type DispatchEventType = keyof DispatchPayloadMap;

export type DispatchFrame = {
  [K in DispatchEventType]: { op: "DISPATCH"; t: K; d: DispatchPayloadMap[K] };
}[DispatchEventType];

export type ServerFrame = ReadyFrame | HeartbeatAckFrame | ErrorFrame | DispatchFrame;
