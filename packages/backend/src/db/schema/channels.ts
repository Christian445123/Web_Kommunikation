import { sql } from "drizzle-orm";
import { mysqlTable, varchar, text, int, bigint, boolean, timestamp, primaryKey, mysqlEnum } from "drizzle-orm/mysql-core";
import { servers } from "./servers.js";
import { users } from "./users.js";

export const channels = mysqlTable("channels", {
  id: varchar("id", { length: 36 }).primaryKey(),
  // NULL for dm / group_dm channels
  serverId: varchar("server_id", { length: 36 }).references(() => servers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }),
  type: mysqlEnum("type", ["text", "voice", "dm", "group_dm"]).notNull(),
  topic: text("topic"),
  position: int("position").notNull().default(0),
  // Phase 2 hook: per-channel E2E toggle, unused in Phase 1.
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const channelPermissionOverwrites = mysqlTable(
  "channel_permission_overwrites",
  {
    channelId: varchar("channel_id", { length: 36 })
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 8 }).notNull(), // 'role' | 'user'
    targetId: varchar("target_id", { length: 36 }).notNull(),
    // sql`` defaults, not JS bigint literals - see roles.ts for why (drizzle-kit's snapshot
    // differ can't JSON.stringify a raw BigInt).
    allow: bigint("allow", { mode: "bigint" }).notNull().default(sql`0`),
    deny: bigint("deny", { mode: "bigint" }).notNull().default(sql`0`),
  },
  (t) => ({ pk: primaryKey({ columns: [t.channelId, t.targetType, t.targetId] }) }),
);

export const dmParticipants = mysqlTable(
  "dm_participants",
  {
    channelId: varchar("channel_id", { length: 36 })
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.channelId, t.userId] }) }),
);
