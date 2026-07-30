import { and, desc, eq, isNull, lt } from "drizzle-orm";
import type { Message, MessagePageQuery } from "@nythera/shared";
import { db } from "../../db/client.js";
import { messages } from "../../db/schema/index.js";
import { Forbidden, NotFound } from "../../lib/errors.js";

type MessageRow = typeof messages.$inferSelect;

export function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    channelId: row.channelId,
    authorId: row.authorId,
    content: row.content,
    replyToId: row.replyToId,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listChannelMessages(channelId: string, query: MessagePageQuery): Promise<Message[]> {
  let beforeCreatedAt: Date | undefined;
  if (query.before) {
    const [cursor] = await db.select({ createdAt: messages.createdAt }).from(messages).where(eq(messages.id, query.before)).limit(1);
    beforeCreatedAt = cursor?.createdAt;
  }

  const rows = await db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.channelId, channelId),
        isNull(messages.deletedAt),
        beforeCreatedAt ? lt(messages.createdAt, beforeCreatedAt) : undefined,
      ),
    )
    .orderBy(desc(messages.createdAt))
    .limit(query.limit);

  return rows.map(mapMessage);
}

export async function createMessage(channelId: string, authorId: string, content: string, replyToId?: string | null): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values({ channelId, authorId, content, replyToId: replyToId ?? null })
    .returning();
  return mapMessage(row!);
}

export async function updateMessage(messageId: string, authorId: string, content: string): Promise<Message> {
  const [existing] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!existing || existing.deletedAt) throw NotFound("Message not found");
  if (existing.authorId !== authorId) throw Forbidden("Cannot edit another user's message");

  const [row] = await db.update(messages).set({ content, editedAt: new Date() }).where(eq(messages.id, messageId)).returning();
  return mapMessage(row!);
}

export async function getMessageOrThrow(messageId: string): Promise<MessageRow> {
  const [row] = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);
  if (!row || row.deletedAt) throw NotFound("Message not found");
  return row;
}

export async function deleteMessage(messageId: string, requesterId: string, canManageMessages: boolean): Promise<{ channelId: string }> {
  const existing = await getMessageOrThrow(messageId);
  if (existing.authorId !== requesterId && !canManageMessages) throw Forbidden("Cannot delete another user's message");

  await db.update(messages).set({ deletedAt: new Date() }).where(eq(messages.id, messageId));
  return { channelId: existing.channelId };
}
