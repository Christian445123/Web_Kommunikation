import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./users.js";

/**
 * A bot "Application" owned by a developer. The bot itself is a real row in `users`
 * (flagged isBot) - see lib/botAuth.ts for why: it lets every existing REST/gateway/permission
 * code path work for bots unchanged, since they're all keyed purely by userId.
 */
export const botApplications = mysqlTable("bot_applications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  botUserId: varchar("bot_user_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 64 }).notNull(),
  description: text("description"),
  iconUrl: text("icon_url"),
  tokenHash: varchar("token_hash", { length: 64 }).notNull(),
  tokenLastFour: varchar("token_last_four", { length: 4 }).notNull(),
  disabledAt: timestamp("disabled_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
