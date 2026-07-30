import { mysqlTable, varchar, text, timestamp, json, index, type AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { channels } from "./channels.js";
import { users } from "./users.js";
import { blob } from "../customTypes.js";

export const messages = mysqlTable(
  "messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    channelId: varchar("channel_id", { length: 36 })
      .notNull()
      .references(() => channels.id, { onDelete: "cascade" }),
    authorId: varchar("author_id", { length: 36 })
      .notNull()
      .references(() => users.id),
    // Phase 1: plaintext. Phase 2: null when channel.isEncrypted, ciphertext used instead.
    content: text("content"),
    ciphertext: blob("ciphertext"),
    ratchetMeta: json("ratchet_meta"),
    replyToId: varchar("reply_to_id", { length: 36 }).references((): AnyMySqlColumn => messages.id),
    editedAt: timestamp("edited_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ channelCreatedIdx: index("messages_channel_created_idx").on(t.channelId, t.createdAt) }),
);
