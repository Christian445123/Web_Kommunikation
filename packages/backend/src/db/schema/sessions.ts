import { mysqlTable, varchar, text, timestamp } from "drizzle-orm/mysql-core";
import { users } from "./users.js";

/**
 * A "session" = a logical device/refresh-token. Reused in Phase 2 as the
 * anchor for E2E device identity (one session/device = one Olm identity).
 */
export const sessions = mysqlTable("sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // SHA-256 hex digest, fixed 64 chars - varchar (not text) so it stays indexable/equality-fast.
  refreshTokenHash: varchar("refresh_token_hash", { length: 64 }).notNull(),
  // Kept to detect reuse of a token that was already rotated away (theft signal).
  previousRefreshTokenHash: varchar("previous_refresh_token_hash", { length: 64 }),
  deviceLabel: text("device_label"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at").notNull().defaultNow(),
  revokedAt: timestamp("revoked_at"),
});
