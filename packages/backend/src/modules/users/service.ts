import { eq, or } from "drizzle-orm";
import type { User } from "@nythera/shared";
import { db } from "../../db/client.js";
import { users } from "../../db/schema/index.js";
import { NotFound, BadRequest } from "../../lib/errors.js";
import { isServerMember } from "../../lib/permissionResolver.js";

type UserRow = typeof users.$inferSelect;

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    isBot: row.isBot,
    showcasedServerId: row.showcasedServerId,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findUserById(id: string): Promise<UserRow | undefined> {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

export async function findUserByEmailOrUsername(emailOrUsername: string): Promise<UserRow | undefined> {
  const [row] = await db
    .select()
    .from(users)
    .where(or(eq(users.email, emailOrUsername), eq(users.username, emailOrUsername)))
    .limit(1);
  return row;
}

export async function getUserByIdOrThrow(id: string): Promise<UserRow> {
  const row = await findUserById(id);
  if (!row) throw NotFound("User not found");
  return row;
}

export async function updateMe(
  id: string,
  patch: { displayName?: string; avatarUrl?: string | null; showcasedServerId?: string | null },
): Promise<User> {
  if (patch.showcasedServerId) {
    if (!(await isServerMember(patch.showcasedServerId, id))) {
      throw BadRequest("Can only showcase a server you are a member of");
    }
  }
  await db.update(users).set(patch).where(eq(users.id, id));
  const row = await findUserById(id);
  if (!row) throw NotFound("User not found");
  return mapUser(row);
}
