/**
 * Versioned policy identifiers. Bumping these forces new registrations to accept the new
 * version (via RegisterInputSchema's z.literal checks) - a stale frontend build that hasn't
 * picked up a bump fails loudly instead of silently recording consent to an outdated policy.
 * Re-consent enforcement for *existing* users on a version bump is not implemented (see plan).
 */
export const CURRENT_TERMS_VERSION = "2026-07-30";
export const CURRENT_PRIVACY_VERSION = "2026-07-30";
