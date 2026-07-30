import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import type { CreateRoleInput, Role, UpdateRoleInput } from "@nythera/shared";
import { permissionsFromString } from "@nythera/shared";
import { db } from "../../db/client.js";
import { roles } from "../../db/schema/index.js";
import { NotFound, BadRequest } from "../../lib/errors.js";

type RoleRow = typeof roles.$inferSelect;

export function mapRole(row: RoleRow): Role {
  return {
    id: row.id,
    serverId: row.serverId,
    name: row.name,
    color: row.color,
    icon: row.icon,
    position: row.position,
    permissions: row.permissions.toString(),
    isDefault: row.isDefault,
    managedByBotApplicationId: row.managedByBotApplicationId,
  };
}

export async function listRoles(serverId: string): Promise<Role[]> {
  const rows = await db.select().from(roles).where(eq(roles.serverId, serverId));
  return rows.map(mapRole);
}

export async function createRole(serverId: string, input: CreateRoleInput): Promise<Role> {
  const [top] = await db
    .select({ position: roles.position })
    .from(roles)
    .where(eq(roles.serverId, serverId))
    .orderBy(desc(roles.position))
    .limit(1);

  const id = randomUUID();
  const permissions = input.permissions ? permissionsFromString(input.permissions) : 0n;
  const position = (top?.position ?? 0) + 1;

  await db.insert(roles).values({
    id,
    serverId,
    name: input.name,
    color: input.color ?? null,
    icon: input.icon ?? null,
    position,
    permissions,
  });

  return mapRole({
    id,
    serverId,
    name: input.name,
    color: input.color ?? null,
    icon: input.icon ?? null,
    position,
    permissions,
    isDefault: false,
    managedByBotApplicationId: null,
  });
}

export async function updateRole(serverId: string, roleId: string, input: UpdateRoleInput): Promise<Role> {
  const [existing] = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.serverId, serverId))).limit(1);
  if (!existing) throw NotFound("Role not found");

  await db
    .update(roles)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.icon !== undefined && { icon: input.icon }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.permissions !== undefined && { permissions: permissionsFromString(input.permissions) }),
    })
    .where(eq(roles.id, roleId));

  const [row] = await db.select().from(roles).where(eq(roles.id, roleId)).limit(1);
  return mapRole(row!);
}

export async function deleteRole(serverId: string, roleId: string): Promise<void> {
  const [existing] = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.serverId, serverId))).limit(1);
  if (!existing) throw NotFound("Role not found");
  if (existing.isDefault) throw BadRequest("Cannot delete the @everyone role");
  await db.delete(roles).where(eq(roles.id, roleId));
}
