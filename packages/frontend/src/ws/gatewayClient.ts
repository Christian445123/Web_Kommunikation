import type { ClientFrame, DispatchEventType, DispatchPayloadMap, ReadyFrame, ServerFrame } from "@nythera/shared";
import { getAccessToken } from "../api/client.js";

type Listener<K extends DispatchEventType> = (payload: DispatchPayloadMap[K]) => void;

// Tolerates VITE_GATEWAY_URL being given as http(s):// (e.g. copied from an API URL) by
// normalizing it to the ws(s):// scheme the WebSocket constructor actually requires.
function toWebSocketUrl(url: string): string {
  if (url.startsWith("https://")) return `wss://${url.slice("https://".length)}`;
  if (url.startsWith("http://")) return `ws://${url.slice("http://".length)}`;
  return url;
}

const GATEWAY_URL = toWebSocketUrl(import.meta.env.VITE_GATEWAY_URL as string);
const HEARTBEAT_INTERVAL_MS = 20_000;
const MAX_BACKOFF_MS = 15_000;

class GatewayClient {
  private ws: WebSocket | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private manuallyClosed = true;
  private listeners = new Map<DispatchEventType, Set<(payload: unknown) => void>>();
  private readyListeners = new Set<(payload: ReadyFrame["d"]) => void>();

  connect(): void {
    this.manuallyClosed = false;
    this.open();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  private open(): void {
    const ws = new WebSocket(GATEWAY_URL);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      const token = getAccessToken();
      if (token) this.sendFrame({ op: "IDENTIFY", token });
      this.startHeartbeat();
    });

    ws.addEventListener("message", (event) => {
      const frame = JSON.parse(event.data as string) as ServerFrame;
      this.handleFrame(frame);
    });

    ws.addEventListener("close", () => {
      this.stopHeartbeat();
      if (!this.manuallyClosed) this.scheduleReconnect();
    });

    ws.addEventListener("error", () => {
      ws.close();
    });
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    this.reconnectAttempt += 1;
    setTimeout(() => {
      if (!this.manuallyClosed) this.open();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => this.sendFrame({ op: "HEARTBEAT" }), HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  sendFrame(frame: ClientFrame): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(frame));
  }

  onReady(handler: (payload: ReadyFrame["d"]) => void): () => void {
    this.readyListeners.add(handler);
    return () => this.readyListeners.delete(handler);
  }

  on<K extends DispatchEventType>(type: K, handler: Listener<K>): () => void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(handler as (payload: unknown) => void);
    return () => set!.delete(handler as (payload: unknown) => void);
  }

  private handleFrame(frame: ServerFrame): void {
    if (frame.op === "READY") {
      for (const l of this.readyListeners) l(frame.d);
      return;
    }
    if (frame.op === "DISPATCH") {
      const set = this.listeners.get(frame.t);
      if (set) for (const l of set) l(frame.d);
      return;
    }
    if (frame.op === "ERROR") {
      console.warn("Gateway error:", frame.d.message);
    }
  }
}

export const gatewayClient = new GatewayClient();
