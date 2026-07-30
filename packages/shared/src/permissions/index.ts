/** Discord-style permission bitflags. Stored as BIGINT in Postgres, bigint in TS. */
export const Permission = {
  VIEW_CHANNEL: 1n << 0n,
  SEND_MESSAGES: 1n << 1n,
  MANAGE_MESSAGES: 1n << 2n,
  MANAGE_CHANNELS: 1n << 3n,
  MANAGE_ROLES: 1n << 4n,
  MANAGE_SERVER: 1n << 5n,
  CREATE_INVITE: 1n << 6n,
  KICK_MEMBERS: 1n << 7n,
  BAN_MEMBERS: 1n << 8n,
  CONNECT: 1n << 9n,
  SPEAK: 1n << 10n,
  ADMINISTRATOR: 1n << 11n,
} as const;

export type PermissionFlag = (typeof Permission)[keyof typeof Permission];

/** Sensible default for the auto-created @everyone role. */
export const DEFAULT_EVERYONE_PERMISSIONS =
  Permission.VIEW_CHANNEL | Permission.SEND_MESSAGES | Permission.CREATE_INVITE | Permission.CONNECT | Permission.SPEAK;

export function hasPermission(mask: bigint, flag: PermissionFlag): boolean {
  if ((mask & Permission.ADMINISTRATOR) === Permission.ADMINISTRATOR) return true;
  return (mask & flag) === flag;
}

export function combinePermissions(masks: bigint[]): bigint {
  return masks.reduce((acc, m) => acc | m, 0n);
}

/** Applies per-channel role/user allow+deny overwrites on top of a base permission mask. */
export function applyOverwrites(base: bigint, allow: bigint, deny: bigint): bigint {
  return (base & ~deny) | allow;
}

/** Serialize bigint permission masks for JSON/DB (bigint isn't JSON-serializable directly). */
export function permissionsToString(mask: bigint): string {
  return mask.toString();
}

export function permissionsFromString(value: string): bigint {
  return BigInt(value);
}
