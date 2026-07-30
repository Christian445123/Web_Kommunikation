import { pgTable, uuid, text, integer, bigint, boolean, timestamp, primaryKey, pgEnum } from "drizzle-orm/pg-core";
import { servers } from "./servers.js";
import { users } from "./users.js";

export const channelTypeEnum = pgEnum("channel_type", ["text", "voice", "dm", "group_dm"]);

export const channels = pgTable("channels", {
  id: uuid("id").primaryKey().defaultRandom(),
  // NULL for dm / group_dm channels
  serverId: uuid("server_id").references(() => servers.id, { onDelete: "cascade" }),
  name: text("name"),
  type: channelTypeEnum("type").notNull(),
  topic: text("topic"),
  position: integer("position").notNull().default(0),
  // Phase 2 hook: per-channel E2E toggle, unused in Phase 1.
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const channelPermissionOverwrites = pgTable(
  "channel_permission_overwrites",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    targetType: text("target_type").notNull(), // 'role' | 'user'
    targetId: uuid("target_id").notNull(),
    allow: bigint("allow", { mode: "bigint" }).notNull().default(0n),
    deny: bigint("deny", { mode: "bigint" }).notNull().default(0n),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.targetType, t.targetId] })],
);

export const dmParticipants = pgTable(
  "dm_participants",
  {
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.channelId, t.userId] })],
);
