import { and, eq } from "drizzle-orm";
import { applyOverwrites, combinePermissions, hasPermission, Permission, type PermissionFlag } from "@nythera/shared";
import { db } from "../db/client.js";
import { channelPermissionOverwrites, channels, memberRoles, roles, serverMembers } from "../db/schema/index.js";
import { Forbidden, NotFound } from "./errors.js";

export async function isServerMember(serverId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ userId: serverMembers.userId })
    .from(serverMembers)
    .where(and(eq(serverMembers.serverId, serverId), eq(serverMembers.userId, userId)))
    .limit(1);
  return !!row;
}

/** Base server-level permission mask: union of the @everyone role and all explicitly assigned roles. */
export async function getServerPermissions(serverId: string, userId: string): Promise<bigint> {
  const everyone = await db
    .select({ permissions: roles.permissions })
    .from(roles)
    .where(and(eq(roles.serverId, serverId), eq(roles.isDefault, true)))
    .limit(1);

  const assigned = await db
    .select({ permissions: roles.permissions })
    .from(memberRoles)
    .innerJoin(roles, eq(memberRoles.roleId, roles.id))
    .where(and(eq(memberRoles.serverId, serverId), eq(memberRoles.userId, userId)));

  return combinePermissions([...(everyone[0] ? [everyone[0].permissions] : []), ...assigned.map((r) => r.permissions)]);
}

/** Channel-scoped permissions: base server permissions with per-channel role/user overwrites applied. */
export async function getChannelPermissions(channelId: string, userId: string): Promise<bigint> {
  const [channel] = await db.select().from(channels).where(eq(channels.id, channelId)).limit(1);
  if (!channel) throw NotFound("Channel not found");

  if (channel.type === "dm" || channel.type === "group_dm") {
    // DMs have no role system - membership itself grants full access, checked separately.
    return Permission.VIEW_CHANNEL | Permission.SEND_MESSAGES;
  }
  if (!channel.serverId) return 0n;

  let mask = await getServerPermissions(channel.serverId, userId);

  const assignedRoleIds = await db
    .select({ roleId: memberRoles.roleId })
    .from(memberRoles)
    .where(and(eq(memberRoles.serverId, channel.serverId), eq(memberRoles.userId, userId)));
  const everyoneRole = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.serverId, channel.serverId), eq(roles.isDefault, true)))
    .limit(1);
  const roleIds = [...(everyoneRole[0] ? [everyoneRole[0].id] : []), ...assignedRoleIds.map((r) => r.roleId)];

  const overwrites = await db
    .select()
    .from(channelPermissionOverwrites)
    .where(eq(channelPermissionOverwrites.channelId, channelId));

  for (const roleId of roleIds) {
    const overwrite = overwrites.find((o) => o.targetType === "role" && o.targetId === roleId);
    if (overwrite) mask = applyOverwrites(mask, overwrite.allow, overwrite.deny);
  }
  const userOverwrite = overwrites.find((o) => o.targetType === "user" && o.targetId === userId);
  if (userOverwrite) mask = applyOverwrites(mask, userOverwrite.allow, userOverwrite.deny);

  return mask;
}

export async function requireServerPermission(serverId: string, userId: string, flag: PermissionFlag): Promise<void> {
  const mask = await getServerPermissions(serverId, userId);
  if (!hasPermission(mask, flag)) throw Forbidden("Missing required permission");
}

export async function requireChannelPermission(channelId: string, userId: string, flag: PermissionFlag): Promise<void> {
  const mask = await getChannelPermissions(channelId, userId);
  if (!hasPermission(mask, flag)) throw Forbidden("Missing required permission");
}
