import type { WebSocket } from "ws";

/** Live WS connections per user (a user can have multiple devices/tabs open). */
const connections = new Map<string, Set<WebSocket>>();

export function addConnection(userId: string, socket: WebSocket): void {
  let set = connections.get(userId);
  if (!set) {
    set = new Set();
    connections.set(userId, set);
  }
  set.add(socket);
}

export function removeConnection(userId: string, socket: WebSocket): void {
  const set = connections.get(userId);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) connections.delete(userId);
}

export function getSockets(userId: string): Set<WebSocket> | undefined {
  return connections.get(userId);
}

export function isOnline(userId: string): boolean {
  return connections.has(userId);
}

export function onlineUserIds(): string[] {
  return [...connections.keys()];
}
