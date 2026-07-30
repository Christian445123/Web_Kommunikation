import { hash, verify } from "@node-rs/argon2";
import { randomBytes, createHash } from "node:crypto";

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}

/** Opaque, high-entropy refresh token. Only its SHA-256 hash is persisted. */
export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateInviteCode(): string {
  return randomBytes(6).toString("base64url");
}

/** Prefix lets plugins/auth.ts and the gateway IDENTIFY handler tell bot tokens from user JWTs. */
export const BOT_TOKEN_PREFIX = "nyth_bot_";

export function generateBotToken(): string {
  return `${BOT_TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}
