import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  consentRecords,
  dmParticipants,
  invites,
  memberRoles,
  messages,
  serverMembers,
  servers,
  sessions,
  users,
} from "../../db/schema/index.js";
import { NotFound, Unauthorized } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/crypto.js";
import { getSockets } from "../../gateway/connectionRegistry.js";

/**
 * DSGVO Art. 15/20 (access & portability): a machine-readable dump of everything this app
 * stores that is either this user's own personal data, or content they authored. Never
 * includes other users' secrets (password hashes, token hashes, provider keys, etc).
 */
export async function exportUserData(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw NotFound("User not found");

  const [mySessions, memberships, ownedServers, roleAssignments, authoredMessages, dmChannels, createdInvites, consent] =
    await Promise.all([
      db
        .select({
          id: sessions.id,
          deviceLabel: sessions.deviceLabel,
          createdAt: sessions.createdAt,
          lastUsedAt: sessions.lastUsedAt,
          expiresAt: sessions.expiresAt,
          revokedAt: sessions.revokedAt,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId)),
      db
        .select({ serverId: serverMembers.serverId, nickname: serverMembers.nickname, joinedAt: serverMembers.joinedAt })
        .from(serverMembers)
        .where(eq(serverMembers.userId, userId)),
      db.select().from(servers).where(eq(servers.ownerId, userId)),
      db.select({ serverId: memberRoles.serverId, roleId: memberRoles.roleId }).from(memberRoles).where(eq(memberRoles.userId, userId)),
      db
        .select({
          id: messages.id,
          channelId: messages.channelId,
          content: messages.content,
          createdAt: messages.createdAt,
          editedAt: messages.editedAt,
          deletedAt: messages.deletedAt,
        })
        .from(messages)
        .where(eq(messages.authorId, userId)),
      db.select({ channelId: dmParticipants.channelId }).from(dmParticipants).where(eq(dmParticipants.userId, userId)),
      db.select().from(invites).where(eq(invites.createdBy, userId)),
      db.select().from(consentRecords).where(eq(consentRecords.userId, userId)),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      showcasedServerId: user.showcasedServerId,
      createdAt: user.createdAt,
    },
    sessions: mySessions,
    serverMemberships: memberships,
    ownedServers,
    roleAssignments,
    authoredMessages,
    dmChannelIds: dmChannels.map((d) => d.channelId),
    createdInvites,
    consentRecords: consent,
  };
}

/**
 * DSGVO Art. 17 (right to erasure). Anonymizes the user's row in place rather than hard-deleting
 * it: messages.authorId has no ON DELETE clause, so a hard delete would be rejected by Postgres
 * the moment this user has ever authored a message. Anonymizing produces the same visible
 * result ("Deleted User" on all historical messages) as a single O(1) update, with no need to
 * touch the messages table at all. consent_records are deliberately left untouched (they remain
 * valid proof of consent, tied to the still-existing, now-anonymized users.id).
 */
export async function eraseAccount(userId: string, password: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw NotFound("User not found");

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) throw Unauthorized("Incorrect password");

  const anonymizedSuffix = randomUUID().slice(0, 8);
  const unusablePasswordHash = await hashPassword(randomUUID());

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        username: `deleted-user-${anonymizedSuffix}`,
        displayName: "Deleted User",
        email: `deleted+${userId}@deleted.invalid`,
        passwordHash: unusablePasswordHash,
        avatarUrl: null,
        showcasedServerId: null,
        deletedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await tx.update(serverMembers).set({ nickname: null }).where(eq(serverMembers.userId, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });

  // Force-close any live gateway connections so the deletion is felt immediately, not just
  // after the (already-accepted, stateless-JWT) access token naturally expires.
  const sockets = getSockets(userId);
  if (sockets) for (const socket of sockets) socket.close();
}
