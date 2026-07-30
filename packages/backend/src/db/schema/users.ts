import { mysqlTable, varchar, text, timestamp, boolean, type AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { servers } from "./servers.js";

// MySQL has no native UUID type; ids are generated app-side (crypto.randomUUID()) and stored
// as CHAR(36)/varchar(36). This also means inserts never rely on RETURNING - the caller
// already knows the id it generated before the insert.
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  displayName: varchar("display_name", { length: 64 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  isBot: boolean("is_bot").notNull().default(false),
  // The one server whose tag this user showcases app-wide (opt-in, nullable). Membership in
  // that server is enforced at the service layer, not here - a plain FK only guards existence.
  showcasedServerId: varchar("showcased_server_id", { length: 36 }).references((): AnyMySqlColumn => servers.id, {
    onDelete: "set null",
  }),
  // DSGVO Art. 17: set on account erasure. The row itself is anonymized in place, never
  // hard-deleted (messages.authorId has no ON DELETE clause and historical messages must
  // still resolve to a "deleted user" placeholder rather than break with a dangling FK).
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
