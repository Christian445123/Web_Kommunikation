import { pgTable, uuid, text, timestamp, jsonb, index, type AnyPgColumn } from "drizzle-orm/pg-core";
import { channels } from "./channels.js";
import { users } from "./users.js";
import { bytea } from "../customTypes.js";

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    // Phase 1: plaintext. Phase 2: null when channel.isEncrypted, ciphertext used instead.
    content: text("content"),
    ciphertext: bytea("ciphertext"),
    ratchetMeta: jsonb("ratchet_meta"),
    replyToId: uuid("reply_to_id").references((): AnyPgColumn => messages.id),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_channel_created_idx").on(t.channelId, t.createdAt)],
);
