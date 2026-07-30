import { eq } from "drizzle-orm";
import type { ServerFrame } from "@nythera/shared";
import { db } from "../db/client.js";
import { channels, dmParticipants, serverMembers } from "../db/schema/index.js";
import { getSockets } from "./connectionRegistry.js";

function send(socket: { readyState: number; send: (data: string) => void }, frame: ServerFrame) {
  if (socket.readyState !== 1 /* OPEN */) return;
  socket.send(JSON.stringify(frame));
}

export function sendToUser(userId: string, frame: ServerFrame): void {
  const sockets = getSockets(userId);
  if (!sockets) return;
  for (const socket of sockets) send(socket, frame);
}

export function sendToUsers(userIds: Iterable<string>, frame: ServerFrame): void {
  for (const userId of userIds) sendToUser(userId, frame);
}

export async function serverMemberIds(serverId: string): Promise<string[]> {
  const rows = await db.select({ userId: serverMembers.userId }).from(serverMembers).where(eq(serverMembers.serverId, serverId));
  return rows.map((r) => r.userId);
}

export async function broadcastToServer(serverId: string, frame: ServerFrame): Promise<void> {
  sendToUsers(await serverMemberIds(serverId), frame);
}

export async function dmParticipantIds(channelId: string): Promise<string[]> {
  const rows = await db.select({ userId: dmParticipants.userId }).from(dmParticipants).where(eq(dmParticipants.channelId, channelId));
  return rows.map((r) => r.userId);
}

/** Resolves who should receive channel-scoped events (message create/update/etc). */
export async function channelAudienceIds(channelId: string): Promise<string[]> {
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  if (!channel) return [];
  if (channel.type === "dm" || channel.type === "group_dm") {
    return dmParticipantIds(channelId);
  }
  if (channel.serverId) return serverMemberIds(channel.serverId);
  return [];
}

export async function broadcastToChannel(channelId: string, frame: ServerFrame): Promise<void> {
  sendToUsers(await channelAudienceIds(channelId), frame);
}

/** Everyone who shares a server or a DM with this user - the audience for their presence updates. */
export async function presenceAudienceIds(userId: string): Promise<string[]> {
  const audience = new Set<string>();

  const memberships = await db.select({ serverId: serverMembers.serverId }).from(serverMembers).where(eq(serverMembers.userId, userId));
  for (const { serverId } of memberships) {
    for (const id of await serverMemberIds(serverId)) audience.add(id);
  }

  const dms = await db.select({ channelId: dmParticipants.channelId }).from(dmParticipants).where(eq(dmParticipants.userId, userId));
  for (const { channelId } of dms) {
    for (const id of await dmParticipantIds(channelId)) audience.add(id);
  }

  audience.delete(userId);
  return [...audience];
}
