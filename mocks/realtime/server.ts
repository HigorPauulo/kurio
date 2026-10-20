import { toSocketIo } from "@mswjs/socket.io-binding";
import { ws } from "msw";
import { nftSubscriptionSchema, orderSubscriptionSchema, type SubscriptionAck } from "@/contracts/events";
import type { MockDb, MockDbEvent } from "../db/mockDb";
import { isConnectPacket, readConnectAuth, readEventPacket } from "../handshake";
import type { Scenario } from "../scenarios/presets";

const PING_INTERVAL_MS = 25_000;
const ENGINE_IO_PING = "2";
const DUPLICATE_REPLAY_MS = 1_000;
const REFUSAL = { message: "SESSION_EXPIRED", data: { code: "SESSION_EXPIRED" } };

export const REALTIME_URL = "wss://realtime.kurio.mock/*";

type ClientLink = { send: (data: string) => void; close: () => void };

type ClientState = {
  link: ClientLink;
  userId: string | null;
  isAuthorized: boolean;
  nftIds: Set<string>;
  orderIds: Set<string>;
};

export type RealtimeStats = { sockets: number; authenticated: number; subscriptions: number; delivered: number };

export type RealtimeServer = {
  handler: ReturnType<ReturnType<typeof ws.link>["addEventListener"]>;
  dropConnections: (options?: { reconnectAfterMs?: number }) => void;
  stats: () => RealtimeStats;
};

export type RealtimeServerDeps = {
  db: MockDb;
  getScenario: () => Scenario;
  now: () => number;
};

function sendEvent(link: ClientLink, event: MockDbEvent): void {
  link.send(`42${JSON.stringify([event.type, event])}`);
}

export function createRealtimeServer({ db, getScenario, now }: RealtimeServerDeps): RealtimeServer {
  const clients = new Set<ClientState>();
  const lastEventByResource = new Map<string, MockDbEvent>();
  let refuseUntil = 0;
  let delivered = 0;

  function sessionUserId(token: string): string | null {
    const session = db.read((tables) => tables.sessions[token]);
    if (!session || Date.parse(session.expiresAt) <= now()) return null;
    return session.userId;
  }

  function isAudience(client: ClientState, event: MockDbEvent): boolean {
    if (!client.isAuthorized) return false;
    if (event.type === "nft.updated") return client.nftIds.has(event.resource.id);
    return event.audience?.userId === client.userId && client.orderIds.has(event.resource.id);
  }

  function deliver(event: MockDbEvent): void {
    for (const client of clients) {
      if (!isAudience(client, event)) continue;
      sendEvent(client.link, event);
      delivered += 1;
    }
  }

  db.subscribe((events) => {
    const isDuplicating = Boolean(getScenario().flags.socketDuplicates);
    for (const event of events) {
      const resourceKey = `${event.resource.kind}:${event.resource.id}`;
      const previous = lastEventByResource.get(resourceKey);
      lastEventByResource.set(resourceKey, event);
      deliver(event);
      if (!isDuplicating) continue;
      deliver(event);
      if (previous) setTimeout(() => deliver(previous), DUPLICATE_REPLAY_MS);
    }
  });

  function subscriptionAck(client: ClientState, event: string, payload: unknown): SubscriptionAck | null {
    if (event === "nft.subscribe" || event === "nft.unsubscribe") {
      const parsed = nftSubscriptionSchema.safeParse(payload);
      if (!parsed.success) return null;
      for (const nftId of parsed.data.nftIds) {
        if (event === "nft.unsubscribe") {
          client.nftIds.delete(nftId);
          continue;
        }
        if (client.nftIds.has(nftId)) continue;
        client.nftIds.add(nftId);
        const last = lastEventByResource.get(`nft:${nftId}`);
        if (last) {
          sendEvent(client.link, last);
          delivered += 1;
        }
      }
      return { ok: true };
    }

    const parsed = orderSubscriptionSchema.safeParse(payload);
    if (!parsed.success) return null;
    const { orderId } = parsed.data;
    if (event === "order.unsubscribe") {
      client.orderIds.delete(orderId);
      return { ok: true };
    }
    if (event !== "order.subscribe") return null;
    const order = db.read((tables) => tables.orders[orderId]);
    if (!order) return { ok: false, code: "NOT_FOUND" };
    if (order.userId !== client.userId) return { ok: false, code: "FORBIDDEN" };
    client.orderIds.add(orderId);
    return { ok: true };
  }

  const handler = ws.link(REALTIME_URL).addEventListener("connection", (connection) => {
    const link: ClientLink = {
      send: (data) => connection.client.send(data),
      close: () => connection.client.close(),
    };
    const client: ClientState = { link, userId: null, isAuthorized: false, nftIds: new Set(), orderIds: new Set() };
    clients.add(client);
    const heartbeat = setInterval(() => link.send(ENGINE_IO_PING), PING_INTERVAL_MS);
    connection.client.addEventListener("close", () => {
      clearInterval(heartbeat);
      clients.delete(client);
    });

    connection.client.addEventListener("message", (message) => {
      if (typeof message.data !== "string") return;
      const packet = message.data;

      if (isConnectPacket(packet)) {
        if (now() < refuseUntil) {
          link.close();
          return;
        }
        const auth = readConnectAuth(packet);
        const userId = auth.kind === "token" ? sessionUserId(auth.token) : null;
        client.isAuthorized = auth.kind === "guest" || userId !== null;
        client.userId = userId;
        if (!client.isAuthorized) link.send(`44${JSON.stringify(REFUSAL)}`);
        return;
      }

      const event = readEventPacket(packet);
      if (!event || !client.isAuthorized) return;
      const ack = subscriptionAck(client, event.event, event.payload);
      if (ack && event.ackId !== null) link.send(`43${event.ackId}${JSON.stringify([ack])}`);
    });

    toSocketIo(connection);
  });

  return {
    handler,
    dropConnections({ reconnectAfterMs = 0 } = {}) {
      refuseUntil = now() + reconnectAfterMs;
      for (const client of [...clients]) client.link.close();
    },
    stats() {
      const authorized = [...clients].filter((client) => client.isAuthorized);
      return {
        sockets: authorized.length,
        authenticated: authorized.filter((client) => client.userId !== null).length,
        subscriptions: authorized.reduce((total, client) => total + client.nftIds.size + client.orderIds.size, 0),
        delivered,
      };
    },
  };
}
