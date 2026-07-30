import { customType } from "drizzle-orm/mysql-core";

/**
 * Raw bytes column (MySQL LONGBLOB). Used in Phase 1 only as a forward-compatible, unused
 * column (message ciphertext for the future E2E-encryption phase) so that phase doesn't
 * require a schema migration to add it.
 */
export const blob = customType<{ data: Buffer }>({
  dataType() {
    return "longblob";
  },
});
