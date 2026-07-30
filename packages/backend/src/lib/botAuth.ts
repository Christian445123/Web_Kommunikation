import { and, eq, isNull } from "drizzle-orm";
import { db } from "../db/client.js";
import { botApplications } from "../db/schema/index.js";
import { hashToken } from "./crypto.js";

export interface AuthenticatedBot {
  botUserId: string;
  applicationId: string;
}

/** Resolves a bot token (already confirmed to start with BOT_TOKEN_PREFIX) to its bot user. */
export async function getBotByToken(token: string): Promise<AuthenticatedBot | null> {
  const [row] = await db
    .select({ botUserId: botApplications.botUserId, applicationId: botApplications.id })
    .from(botApplications)
    .where(and(eq(botApplications.tokenHash, hashToken(token)), isNull(botApplications.disabledAt)))
    .limit(1);
  return row ?? null;
}
