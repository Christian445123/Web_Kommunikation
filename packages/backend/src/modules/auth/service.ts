import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { RegisterInput, LoginInput } from "@nythera/shared";
import { db } from "../../db/client.js";
import { consentRecords, sessions, users } from "../../db/schema/index.js";
import { hashPassword, verifyPassword, generateRefreshToken, hashToken } from "../../lib/crypto.js";
import { signAccessToken } from "../../lib/jwt.js";
import { parseDurationMs } from "../../lib/duration.js";
import { env } from "../../config/env.js";
import { AppError, Conflict, Unauthorized } from "../../lib/errors.js";
import { mapUser } from "../users/service.js";

export interface AuthResult {
  user: ReturnType<typeof mapUser>;
  accessToken: string;
  refreshToken: string;
}

async function issueSession(userId: string, deviceLabel?: string): Promise<{ sessionId: string; accessToken: string; refreshToken: string }> {
  const refreshToken = generateRefreshToken();
  const sessionId = randomUUID();
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    refreshTokenHash: hashToken(refreshToken),
    deviceLabel: deviceLabel ?? null,
    expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
  });

  const accessToken = signAccessToken({ sub: userId, sid: sessionId });
  return { sessionId, accessToken, refreshToken };
}

export async function register(input: RegisterInput, deviceLabel?: string, ipAddress?: string): Promise<AuthResult> {
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, input.username))
    .limit(1);
  if (existing.length > 0) throw Conflict("Username already taken");

  const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email)).limit(1);
  if (existingEmail.length > 0) throw Conflict("Email already registered");

  const passwordHash = await hashPassword(input.password);
  const userId = randomUUID();
  const createdAt = new Date();

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      username: input.username,
      displayName: input.displayName,
      email: input.email,
      passwordHash,
      createdAt,
    });

    // DSGVO Art. 7: record exactly which policy versions were accepted, and when.
    await tx.insert(consentRecords).values([
      { id: randomUUID(), userId, policyType: "terms", version: input.acceptedTermsVersion, ipAddress: ipAddress ?? null },
      { id: randomUUID(), userId, policyType: "privacy", version: input.acceptedPrivacyVersion, ipAddress: ipAddress ?? null },
    ]);
  });

  const { accessToken, refreshToken } = await issueSession(userId, deviceLabel);
  return {
    user: mapUser({
      id: userId,
      username: input.username,
      displayName: input.displayName,
      email: input.email,
      passwordHash,
      avatarUrl: null,
      isBot: false,
      showcasedServerId: null,
      deletedAt: null,
      createdAt,
    }),
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput, deviceLabel?: string): Promise<AuthResult> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.username, input.emailOrUsername))
    .limit(1);
  const user = row ?? (await db.select().from(users).where(eq(users.email, input.emailOrUsername)).limit(1))[0];

  if (!user) throw Unauthorized("Invalid credentials");
  const valid = await verifyPassword(user.passwordHash, input.password);
  if (!valid) throw Unauthorized("Invalid credentials");

  const { accessToken, refreshToken } = await issueSession(user.id, deviceLabel);
  return { user: mapUser(user), accessToken, refreshToken };
}

export async function refresh(presentedToken: string): Promise<{ accessToken: string; refreshToken: string }> {
  const presentedHash = hashToken(presentedToken);

  const [session] = await db.select().from(sessions).where(eq(sessions.refreshTokenHash, presentedHash)).limit(1);

  if (session) {
    if (session.revokedAt) throw Unauthorized("Session revoked");
    if (session.expiresAt.getTime() < Date.now()) throw Unauthorized("Session expired");

    const newRefreshToken = generateRefreshToken();
    await db
      .update(sessions)
      .set({
        previousRefreshTokenHash: session.refreshTokenHash,
        refreshTokenHash: hashToken(newRefreshToken),
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
      })
      .where(eq(sessions.id, session.id));

    const accessToken = signAccessToken({ sub: session.userId, sid: session.id });
    return { accessToken, refreshToken: newRefreshToken };
  }

  // Not the current token for any session - check if it's a *previously rotated-away*
  // token being replayed, which signals theft. If so, kill that session outright.
  const [stolen] = await db.select().from(sessions).where(eq(sessions.previousRefreshTokenHash, presentedHash)).limit(1);
  if (stolen) {
    await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, stolen.id));
    throw new AppError(401, "Refresh token reuse detected, session revoked", "TOKEN_REUSE");
  }

  throw Unauthorized("Invalid refresh token");
}

export async function logoutByRefreshToken(presentedToken: string): Promise<void> {
  const presentedHash = hashToken(presentedToken);
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.refreshTokenHash, presentedHash));
}
