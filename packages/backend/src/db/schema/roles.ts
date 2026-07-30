import { pgTable, uuid, text, integer, bigint, boolean, primaryKey, foreignKey } from "drizzle-orm/pg-core";
import { servers, serverMembers } from "./servers.js";

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  serverId: uuid("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: integer("color"),
  position: integer("position").notNull().default(0),
  permissions: bigint("permissions", { mode: "bigint" }).notNull().default(0n),
  isDefault: boolean("is_default").notNull().default(false),
});

export const memberRoles = pgTable(
  "member_roles",
  {
    serverId: uuid("server_id").notNull(),
    userId: uuid("user_id").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.serverId, t.userId, t.roleId] }),
    foreignKey({
      columns: [t.serverId, t.userId],
      foreignColumns: [serverMembers.serverId, serverMembers.userId],
    }).onDelete("cascade"),
  ],
);
