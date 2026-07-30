import { and, eq } from "drizzle-orm";
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
    position: row.position,
    permissions: row.permissions.toString(),
    isDefault: row.isDefault,
  };
}

export async function listRoles(serverId: string): Promise<Role[]> {
  const rows = await db.select().from(roles).where(eq(roles.serverId, serverId));
  return rows.map(mapRole);
}

export async function createRole(serverId: string, input: CreateRoleInput): Promise<Role> {
  const [{ maxPosition } = { maxPosition: 0 }] = await db
    .select({ maxPosition: roles.position })
    .from(roles)
    .where(eq(roles.serverId, serverId))
    .orderBy(roles.position);

  const [row] = await db
    .insert(roles)
    .values({
      serverId,
      name: input.name,
      color: input.color ?? null,
      position: (maxPosition ?? 0) + 1,
      permissions: input.permissions ? permissionsFromString(input.permissions) : 0n,
    })
    .returning();
  return mapRole(row!);
}

export async function updateRole(serverId: string, roleId: string, input: UpdateRoleInput): Promise<Role> {
  const [existing] = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.serverId, serverId))).limit(1);
  if (!existing) throw NotFound("Role not found");

  const [row] = await db
    .update(roles)
    .set({
      ...(input.name !== undefined && { name: input.name }),
      ...(input.color !== undefined && { color: input.color }),
      ...(input.position !== undefined && { position: input.position }),
      ...(input.permissions !== undefined && { permissions: permissionsFromString(input.permissions) }),
    })
    .where(eq(roles.id, roleId))
    .returning();
  return mapRole(row!);
}

export async function deleteRole(serverId: string, roleId: string): Promise<void> {
  const [existing] = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.serverId, serverId))).limit(1);
  if (!existing) throw NotFound("Role not found");
  if (existing.isDefault) throw BadRequest("Cannot delete the @everyone role");
  await db.delete(roles).where(eq(roles.id, roleId));
}
