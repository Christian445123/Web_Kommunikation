import type { User } from "@nythera/shared";
import { usersApi } from "./resources.js";

const cache = new Map<string, User>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

export function getCachedUser(id: string): User | undefined {
  return cache.get(id);
}

export function subscribeUserCache(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function ensureUser(id: string): void {
  if (cache.has(id) || inFlight.has(id)) return;
  const promise = usersApi
    .get(id)
    .then((user) => {
      cache.set(id, user);
      for (const l of listeners) l();
    })
    .catch(() => {
      // Unknown/deleted user - leave uncached, callers fall back to a placeholder.
    })
    .finally(() => {
      inFlight.delete(id);
    });
  inFlight.set(id, promise);
}
