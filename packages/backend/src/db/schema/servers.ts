import { mysqlTable, varchar, text, timestamp, primaryKey, int } from "drizzle-orm/mysql-core";
import { users } from "./users.js";

export const servers = mysqlTable("servers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  iconUrl: text("icon_url"),
  bannerUrl: text("banner_url"),
  // Server Tags: a free (non-monetized) per-server badge, opt-in per member via users.showcasedServerId.
  tag: varchar("tag", { length: 4 }),
  tagIconUrl: text("tag_icon_url"),
  tagColor: int("tag_color"),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const serverMembers = mysqlTable(
  "server_members",
  {
    serverId: varchar("server_id", { length: 36 })
      .notNull()
      .references(() => servers.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    nickname: varchar("nickname", { length: 64 }),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.serverId, t.userId] })],
);

export const invites = mysqlTable("invites", {
  code: varchar("code", { length: 32 }).primaryKey(),
  serverId: varchar("server_id", { length: 36 })
    .notNull()
    .references(() => servers.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by", { length: 36 })
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp("expires_at"),
  maxUses: int("max_uses"),
  uses: int("uses").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
