import { mysqlTable, varchar, text, int, bigint, boolean, primaryKey, foreignKey } from "drizzle-orm/mysql-core";
import { servers, serverMembers } from "./servers.js";
import { botApplications } from "./bots.js";

export const roles = mysqlTable("roles", {
  id: varchar("id", { length: 36 }).primaryKey(),
  serverId: varchar("server_id", { length: 36 })
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 64 }).notNull(),
  color: int("color"),
  icon: text("icon"),
  position: int("position").notNull().default(0),
  permissions: bigint("permissions", { mode: "bigint" }).notNull().default(0n),
  isDefault: boolean("is_default").notNull().default(false),
  // Set when this role was auto-created for a bot invite - see modules/bots/service.ts.
  // Read-only in the Roles UI; only changes via the bot-invite flow, not manual editing.
  managedByBotApplicationId: varchar("managed_by_bot_application_id", { length: 36 }).references(() => botApplications.id, {
    onDelete: "cascade",
  }),
});

export const memberRoles = mysqlTable(
  "member_roles",
  {
    serverId: varchar("server_id", { length: 36 }).notNull(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    roleId: varchar("role_id", { length: 36 })
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
