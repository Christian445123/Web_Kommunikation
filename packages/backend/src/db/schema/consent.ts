import { mysqlTable, varchar, text, timestamp, mysqlEnum } from "drizzle-orm/mysql-core";
import { users } from "./users.js";

/** DSGVO Art. 7 evidence: which policy version a user accepted, and when. Never deleted on erasure. */
export const consentRecords = mysqlTable("consent_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  policyType: mysqlEnum("policy_type", ["terms", "privacy"]).notNull(),
  version: varchar("version", { length: 32 }).notNull(),
  acceptedAt: timestamp("accepted_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
});
