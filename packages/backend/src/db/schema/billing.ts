import { mysqlTable, varchar, timestamp, boolean, json, mysqlEnum, unique } from "drizzle-orm/mysql-core";
import { users } from "./users.js";

/** One row per user's current-or-past subscription state - the actual Stripe/PayPal domain object. */
export const subscriptions = mysqlTable("subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: mysqlEnum("provider", ["stripe", "paypal"]).notNull(),
  providerCustomerId: varchar("provider_customer_id", { length: 255 }).notNull(),
  providerSubscriptionId: varchar("provider_subscription_id", { length: 255 }).notNull().unique(),
  // Kept as a real column (not just presence/absence of a row) so a future tier ladder
  // needs no migration - only "free" | "supporter" are actually used today.
  plan: mysqlEnum("plan", ["free", "supporter"]).notNull().default("free"),
  status: mysqlEnum("status", ["active", "past_due", "canceled", "incomplete"]).notNull(),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Webhook idempotency + audit log - both providers retry webhook delivery. */
export const billingWebhookEvents = mysqlTable(
  "billing_webhook_events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    provider: mysqlEnum("provider", ["stripe", "paypal"]).notNull(),
    externalEventId: varchar("external_event_id", { length: 255 }).notNull(),
    payload: json("payload").notNull(),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
  },
  (t) => [unique("billing_webhook_events_provider_event_unique").on(t.provider, t.externalEventId)],
);
