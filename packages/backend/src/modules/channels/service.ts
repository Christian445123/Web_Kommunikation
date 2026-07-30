import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import type { Channel, CreateChannelInput, UpdateChannelInput } from "@nythera/shared";
import { db } from "../../db/client.js";
import { channels } from "../../db/schema/index.js";
import { NotFound } from "../../lib/errors.js";

type ChannelRow = typeof channels.$inferSelect;

export function mapChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    serverId: row.serverId,
    name: row.name,
    type: row.type,
    topic: row.topic,
    position: row.position,
    isEncrypted: row.isEncrypted,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getChannelOrThrow(channelId: string): Promise<ChannelRow> {
  const [row] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  if (!row) throw NotFound("Channel not found");
  return row;
}

export async function listServerChannels(serverId: string): Promise<Channel[]> {
  const rows = await db.select().from(channels).where(eq(channels.serverId, serverId)).orderBy(asc(channels.position));
  return rows.map(mapChannel);
}

export async function createChannel(serverId: string, input: CreateChannelInput): Promise<Channel> {
  const existing = await db.select({ position: channels.position }).from(channels).where(eq(channels.serverId, serverId)).orderBy(asc(channels.position));
  const nextPosition = existing.length > 0 ? Math.max(...existing.map((c) => c.position)) + 1 : 0;

  const id = randomUUID();
  const createdAt = new Date();
  await db.insert(channels).values({
    id,
    serverId,
    name: input.name,
    type: input.type,
    topic: input.topic ?? null,
    position: nextPosition,
    createdAt,
  });

  return mapChannel({
    id,
    serverId,
    name: input.name,
    type: input.type,
    topic: input.topic ?? null,
    position: nextPosition,
    isEncrypted: false,
    createdAt,
  });
}

export async function updateChannel(channelId: string, input: UpdateChannelInput): Promise<Channel> {
  await db
    .update(channels)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.topic !== undefined && { topic: input.topic }),
      ...(input.position !== undefined && { position: input.position }),
    })
    .where(eq(channels.id, channelId));

  return mapChannel(await getChannelOrThrow(channelId));
}

export async function deleteChannel(channelId: string): Promise<void> {
  await db.delete(channels).where(eq(channels.id, channelId));
}
