import { io, type Socket } from "socket.io-client";
import { realtimeEventSchema, subscriptionAckSchema, type RealtimeEvent, type SubscriptionAck } from "@/contracts/events";

const ACK_TIMEOUT_MS = 5_000;
const EVENT_TYPES = ["nft.updated", "order.updated"] as const;

type ConnectError = Error & { data?: { code?: string } };

export type SocketManagerOptions = {
  url: string;
  onEvent: (event: RealtimeEvent) => void;
  onConnect: (isReconnect: boolean) => void;
  onSessionExpired: () => void;
};

export type SocketManager = {
  connect: (token: string | null) => void;
  disconnect: () => void;
  isConnected: () => boolean;
  request: (event: string, payload: unknown) => Promise<SubscriptionAck | null>;
};

export function createSocketManager({ url, onEvent, onConnect, onSessionExpired }: SocketManagerOptions): SocketManager {
  let socket: Socket | null = null;
  let currentToken: string | null | undefined;
  let isRefused = false;
  let hasEverConnected = false;

  function disconnect(): void {
    socket?.removeAllListeners();
    socket?.io.removeAllListeners();
    socket?.disconnect();
    socket = null;
    currentToken = undefined;
  }

  return {
    connect(token) {
      if (socket && currentToken === token) return;
      disconnect();
      isRefused = false;
      currentToken = token;

      const next = io(url, {
        transports: ["websocket"],
        autoConnect: false,
        forceNew: true,
        auth: token ? { token } : {},
      });
      next.on("connect", () => {
        if (isRefused) return;
        onConnect(hasEverConnected);
        hasEverConnected = true;
      });
      next.on("connect_error", (error: ConnectError) => {
        if (error.data?.code !== "SESSION_EXPIRED") return;
        isRefused = true;
        disconnect();
        onSessionExpired();
      });
      for (const type of EVENT_TYPES) {
        next.on(type, (payload: unknown) => {
          const parsed = realtimeEventSchema.safeParse(payload);
          if (parsed.success) onEvent(parsed.data);
        });
      }

      socket = next;
      next.connect();
    },

    disconnect,

    isConnected: () => Boolean(socket?.connected) && !isRefused,

    async request(event, payload) {
      if (!socket) return null;
      try {
        const response: unknown = await socket.timeout(ACK_TIMEOUT_MS).emitWithAck(event, payload);
        const parsed = subscriptionAckSchema.safeParse(response);
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
  };
}
