import { and, eq } from "drizzle-orm";
import type { Channel } from "@nythera/shared";
import { db } from "../../db/client.js";
import { channels, dmParticipants } from "../../db/schema/index.js";
import { mapChannel } from "../channels/service.js";
import { BadRequest } from "../../lib/errors.js";

async function findExisting1to1Dm(userId: string, otherUserId: string): Promise<Channel | undefined> {
  const candidates = await db
    .select({ channelId: dmParticipants.channelId })
    .from(dmParticipants)
    .innerJoin(channels, eq(dmParticipants.channelId, channels.id))
    .where(and(eq(dmParticipants.userId, userId), eq(channels.type, "dm")));

  for (const candidate of candidates) {
    const participants = await db
      .select({ userId: dmParticipants.userId })
      .from(dmParticipants)
      .where(eq(dmParticipants.channelId, candidate.channelId));
    if (participants.length === 2 && participants.some((p) => p.userId === otherUserId)) {
      const [row] = await db.select().from(channels).where(eq(channels.id, candidate.channelId)).limit(1);
      if (row) return mapChannel(row);
    }
  }
  return undefined;
}

export async function getOrCreateDm(userId: string, otherUserId: string): Promise<Channel> {
  if (userId === otherUserId) throw BadRequest("Cannot DM yourself");

  const existing = await findExisting1to1Dm(userId, otherUserId);
  if (existing) return existing;

  const [channel] = await db.insert(channels).values({ serverId: null, type: "dm", name: null, position: 0 }).returning();
  await db.insert(dmParticipants).values([
    { channelId: channel!.id, userId },
    { channelId: channel!.id, userId: otherUserId },
  ]);
  return mapChannel(channel!);
}

export async function listMyDms(userId: string): Promise<Channel[]> {
  const rows = await db
    .select({ channel: channels })
    .from(dmParticipants)
    .innerJoin(channels, eq(dmParticipants.channelId, channels.id))
    .where(eq(dmParticipants.userId, userId));
  return rows.map((r) => mapChannel(r.channel));
}
