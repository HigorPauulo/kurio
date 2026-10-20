import type { RealtimeEvent } from "@/contracts/events";
import { isTerminalOrderStatus } from "@/contracts/order";

const DEFAULT_CAPACITY = 500;

export type ResourceKind = RealtimeEvent["resource"]["kind"];

export type EventStore = {
  reset: (userId: string | null) => void;
  seed: (kind: ResourceKind, id: string, version: number, status?: string) => void;
  knownVersion: (kind: ResourceKind, id: string) => number;
  accept: (event: RealtimeEvent) => boolean;
};

export function createEventStore(capacity = DEFAULT_CAPACITY): EventStore {
  let userId: string | null = null;
  const appliedIds = new Set<string>();
  const versions = new Map<string, number>();
  let terminalOrders = new Set<string>();

  function resourceKey(kind: ResourceKind, id: string): string {
    return `${kind}:${id}`;
  }

  function remember(eventId: string): void {
    appliedIds.add(eventId);
    if (appliedIds.size <= capacity) return;
    const oldest = appliedIds.values().next().value;
    if (oldest !== undefined) appliedIds.delete(oldest);
  }

  function raiseVersion(key: string, version: number): void {
    versions.set(key, Math.max(versions.get(key) ?? -1, version));
  }

  return {
    reset(nextUserId) {
      userId = nextUserId;
      for (const key of [...versions.keys()]) {
        if (key.startsWith("order:")) versions.delete(key);
      }
      terminalOrders = new Set();
    },

    seed(kind, id, version, status) {
      raiseVersion(resourceKey(kind, id), version);
      if (kind === "order" && status && isTerminalOrderStatus(status)) terminalOrders.add(id);
    },

    knownVersion: (kind, id) => versions.get(resourceKey(kind, id)) ?? -1,

    accept(event) {
      const key = resourceKey(event.resource.kind, event.resource.id);
      if (appliedIds.has(event.id)) return false;
      if (event.version <= (versions.get(key) ?? -1)) return false;
      if (event.audience && event.audience.userId !== userId) return false;
      if (event.type === "order.updated" && terminalOrders.has(event.resource.id)) return false;

      remember(event.id);
      raiseVersion(key, event.version);
      if (event.type === "order.updated" && isTerminalOrderStatus(event.data.status)) {
        terminalOrders.add(event.resource.id);
      }
      return true;
    },
  };
}

export const eventStore = createEventStore();
