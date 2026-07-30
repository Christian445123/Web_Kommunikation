import { and, eq } from "drizzle-orm";
import type { CreateServerInput, Invite, Server, ServerMember, UpdateServerInput } from "@nythera/shared";
import { DEFAULT_EVERYONE_PERMISSIONS } from "@nythera/shared";
import { db } from "../../db/client.js";
import { channels, invites, memberRoles, roles, serverMembers, servers } from "../../db/schema/index.js";
import { generateInviteCode } from "../../lib/crypto.js";
import { Conflict, Forbidden, NotFound } from "../../lib/errors.js";

type ServerRow = typeof servers.$inferSelect;

export function mapServer(row: ServerRow): Server {
  return {
    id: row.id,
    name: row.name,
    iconUrl: row.iconUrl,
    ownerId: row.ownerId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getServerOrThrow(serverId: string): Promise<ServerRow> {
  const [row] = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);
  if (!row) throw NotFound("Server not found");
  return row;
}

export async function listMemberServers(userId: string): Promise<Server[]> {
  const rows = await db
    .select({ server: servers })
    .from(serverMembers)
    .innerJoin(servers, eq(serverMembers.serverId, servers.id))
    .where(eq(serverMembers.userId, userId));
  return rows.map((r) => mapServer(r.server));
}

export async function createServer(ownerId: string, input: CreateServerInput): Promise<Server> {
  const [server] = await db
    .insert(servers)
    .values({ name: input.name, iconUrl: input.iconUrl ?? null, ownerId })
    .returning();

  await db.insert(serverMembers).values({ serverId: server!.id, userId: ownerId });

  await db.insert(roles).values({
    serverId: server!.id,
    name: "@everyone",
    position: 0,
    permissions: DEFAULT_EVERYONE_PERMISSIONS,
    isDefault: true,
  });

  await db.insert(channels).values({
    serverId: server!.id,
    name: "general",
    type: "text",
    position: 0,
  });

  return mapServer(server!);
}

export async function updateServer(serverId: string, input: UpdateServerInput): Promise<Server> {
  const [row] = await db
    .update(servers)
    .set({ ...(input.name !== undefined && { name: input.name }), ...(input.iconUrl !== undefined && { iconUrl: input.iconUrl }) })
    .where(eq(servers.id, serverId))
    .returning();
  if (!row) throw NotFound("Server not found");
  return mapServer(row);
}

export async function deleteServer(serverId: string, requesterId: string): Promise<void> {
  const server = await getServerOrThrow(serverId);
  if (server.ownerId !== requesterId) throw Forbidden("Only the owner can delete the server");
  await db.delete(servers).where(eq(servers.id, serverId));
}

export async function createInvite(serverId: string, createdBy: string): Promise<Invite> {
  const [row] = await db
    .insert(invites)
    .values({ code: generateInviteCode(), serverId, createdBy })
    .returning();
  return {
    code: row!.code,
    serverId: row!.serverId,
    createdBy: row!.createdBy,
    expiresAt: row!.expiresAt?.toISOString() ?? null,
    maxUses: row!.maxUses,
    uses: row!.uses,
  };
}

export async function joinViaInvite(code: string, userId: string): Promise<Server> {
  const [invite] = await db.select().from(invites).where(eq(invites.code, code)).limit(1);
  if (!invite) throw NotFound("Invite not found");
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) throw NotFound("Invite expired");
  if (invite.maxUses !== null && invite.uses >= invite.maxUses) throw NotFound("Invite has no uses left");

  const existing = await db
    .select({ userId: serverMembers.userId })
    .from(serverMembers)
    .where(and(eq(serverMembers.serverId, invite.serverId), eq(serverMembers.userId, userId)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(serverMembers).values({ serverId: invite.serverId, userId });
    await db.update(invites).set({ uses: invite.uses + 1 }).where(eq(invites.code, code));
  }

  return mapServer(await getServerOrThrow(invite.serverId));
}

export async function listMembers(serverId: string): Promise<ServerMember[]> {
  const members = await db.select().from(serverMembers).where(eq(serverMembers.serverId, serverId));
  const roleRows = await db.select().from(memberRoles).where(eq(memberRoles.serverId, serverId));

  return members.map((m) => ({
    serverId: m.serverId,
    userId: m.userId,
    nickname: m.nickname,
    joinedAt: m.joinedAt.toISOString(),
    roleIds: roleRows.filter((r) => r.userId === m.userId).map((r) => r.roleId),
  }));
}

export async function updateMember(
  serverId: string,
  userId: string,
  patch: { nickname?: string | null; roleIds?: string[] },
): Promise<ServerMember> {
  if (patch.nickname !== undefined) {
    await db.update(serverMembers).set({ nickname: patch.nickname }).where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)));
  }
  if (patch.roleIds) {
    await db.delete(memberRoles).where(and(eq(memberRoles.serverId, serverId), eq(memberRoles.userId, userId)));
    if (patch.roleIds.length > 0) {
      await db.insert(memberRoles).values(patch.roleIds.map((roleId) => ({ serverId, userId, roleId })));
    }
  }
  const [member] = await listMembers(serverId).then((all) => all.filter((m) => m.userId === userId));
  if (!member) throw NotFound("Member not found");
  return member;
}

export async function kickMember(serverId: string, userId: string): Promise<void> {
  const server = await getServerOrThrow(serverId);
  if (server.ownerId === userId) throw Conflict("Cannot kick the server owner");
  await db.delete(serverMembers).where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)));
}
