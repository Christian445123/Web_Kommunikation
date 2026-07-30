import { customType } from "drizzle-orm/pg-core";

/**
 * Raw bytes column. Used in Phase 1 only as forward-compatible, unused
 * columns (message ciphertext, future prekeys) so Phase 2 doesn't
 * require a schema migration to add them.
 */
export const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});
