import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Permission, permissionsFromString, type BotApplication, type CreateBotApplicationInput } from "@nythera/shared";
import { db } from "../../db/client.js";
import { botApplications, memberRoles, roles, serverMembers, users } from "../../db/schema/index.js";
import { hashPassword, generateBotToken, hashToken } from "../../lib/crypto.js";
import { NotFound, Forbidden } from "../../lib/errors.js";
import { getServerPermissions, requireServerPermission } from "../../lib/permissionResolver.js";
import { broadcastToServer } from "../../gateway/broadcast.js";
import { mapRole } from "../roles/service.js";

type BotApplicationRow = typeof botApplications.$inferSelect;

export function mapBotApplication(row: BotApplicationRow): BotApplication {
  return {
    id: row.id,
    ownerId: row.ownerId,
    botUserId: row.botUserId,
    name: row.name,
    description: row.description,
    iconUrl: row.iconUrl,
    tokenLastFour: row.tokenLastFour,
    disabledAt: row.disabledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function slugifyUsername(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (slug || "bot").slice(0, 20);
}

async function getApplicationRowOrThrow(applicationId: string): Promise<BotApplicationRow> {
  const [row] = await db.select().from(botApplications).where(eq(botApplications.id, applicationId)).limit(1);
  if (!row) throw NotFound("Bot application not found");
  return row;
}

export async function listMyApplications(ownerId: string): Promise<BotApplication[]> {
  const rows = await db.select().from(botApplications).where(eq(botApplications.ownerId, ownerId));
  return rows.map(mapBotApplication);
}

export async function getMyApplicationOrThrow(applicationId: string, ownerId: string): Promise<BotApplication> {
  const row = await getApplicationRowOrThrow(applicationId);
  if (row.ownerId !== ownerId) throw NotFound("Bot application not found");
  return mapBotApplication(row);
}

export async function createApplication(
  ownerId: string,
  input: CreateBotApplicationInput,
): Promise<{ application: BotApplication; token: string }> {
  const botUserId = randomUUID();
  const applicationId = randomUUID();
  const token = generateBotToken();
  const createdAt = new Date();
  const usernameBase = slugifyUsername(input.name);
  const username = `${usernameBase}-bot-${botUserId.slice(0, 8)}`;
  const unusablePasswordHash = await hashPassword(randomUUID());

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: botUserId,
      username,
      displayName: input.name,
      email: `bot+${botUserId}@bots.invalid`,
      passwordHash: unusablePasswordHash,
      isBot: true,
      createdAt,
    });

    await tx.insert(botApplications).values({
      id: applicationId,
      ownerId,
      botUserId,
      name: input.name,
      description: input.description ?? null,
      iconUrl: null,
      tokenHash: hashToken(token),
      tokenLastFour: token.slice(-4),
      createdAt,
    });
  });

  return {
    application: mapBotApplication({
      id: applicationId,
      ownerId,
      botUserId,
      name: input.name,
      description: input.description ?? null,
      iconUrl: null,
      tokenHash: hashToken(token),
      tokenLastFour: token.slice(-4),
      disabledAt: null,
      createdAt,
    }),
    token,
  };
}

export async function regenerateToken(applicationId: string, ownerId: string): Promise<string> {
  const existing = await getApplicationRowOrThrow(applicationId);
  if (existing.ownerId !== ownerId) throw NotFound("Bot application not found");

  const token = generateBotToken();
  await db
    .update(botApplications)
    .set({ tokenHash: hashToken(token), tokenLastFour: token.slice(-4) })
    .where(eq(botApplications.id, applicationId));
  return token;
}

export async function inviteBotToServer(
  applicationId: string,
  serverId: string,
  requestedPermissions: string,
  inviterId: string,
): Promise<void> {
  await requireServerPermission(serverId, inviterId, Permission.MANAGE_SERVER);

  const requestedMask = permissionsFromString(requestedPermissions);
  const inviterMask = await getServerPermissions(serverId, inviterId);
  // Clamping check: a bot invite can never grant permissions the inviter doesn't themselves
  // hold - otherwise a member could use a bot invite link to escalate privileges.
  if ((requestedMask & ~inviterMask) !== 0n) {
    throw Forbidden("Cannot grant a bot permissions you do not have yourself");
  }

  const application = await getApplicationRowOrThrow(applicationId);
  if (application.disabledAt) throw NotFound("Bot application not found");

  const existingMembership = await db
    .select({ userId: serverMembers.userId })
    .from(serverMembers)
    .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, application.botUserId)))
    .limit(1);
  if (existingMembership.length > 0) throw Forbidden("Bot is already a member of this server");

  const roleId = randomUUID();
  await db.insert(roles).values({
    id: roleId,
    serverId,
    name: `${application.name} (Bot)`,
    position: 0,
    permissions: requestedMask,
    isDefault: false,
    managedByBotApplicationId: applicationId,
  });

  await db.insert(serverMembers).values({ serverId, userId: application.botUserId });
  await db.insert(memberRoles).values({ serverId, userId: application.botUserId, roleId });

  const [roleRow] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);

  await broadcastToServer(serverId, {
    op: "DISPATCH",
    t: "SERVER_MEMBER_ADD",
    d: {
      serverId,
      member: { serverId, userId: application.botUserId, nickname: null, joinedAt: new Date().toISOString(), roleIds: [roleId] },
    },
  });
  await broadcastToServer(serverId, { op: "DISPATCH", t: "ROLE_CREATE", d: { serverId, role: mapRole(roleRow!) } });
}
