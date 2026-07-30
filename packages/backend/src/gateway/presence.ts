import { isOnline } from "./connectionRegistry.js";
import { presenceAudienceIds, sendToUsers } from "./broadcast.js";

const OFFLINE_DEBOUNCE_MS = 30_000;
const offlineTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function broadcastPresence(userId: string, status: "online" | "offline"): Promise<void> {
  sendToUsers(await presenceAudienceIds(userId), { op: "DISPATCH", t: "PRESENCE_UPDATE", d: { userId, status } });
}

/** Call when a user's first connection for this session opens. */
export function handleConnect(userId: string, wasAlreadyOnline: boolean): void {
  const pendingOfflineCheck = offlineTimers.get(userId);
  if (pendingOfflineCheck) {
    clearTimeout(pendingOfflineCheck);
    offlineTimers.delete(userId);
  }
  if (!wasAlreadyOnline) {
    void broadcastPresence(userId, "online");
  }
}

/** Call when a connection closes; debounces so a page refresh doesn't flip presence. */
export function handleDisconnect(userId: string): void {
  const timer = setTimeout(() => {
    offlineTimers.delete(userId);
    if (!isOnline(userId)) void broadcastPresence(userId, "offline");
  }, OFFLINE_DEBOUNCE_MS);
  offlineTimers.set(userId, timer);
}
