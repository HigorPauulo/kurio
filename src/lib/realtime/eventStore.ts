import type { RealtimeEvent } from "@/contracts/events";

const DEFAULT_CAPACITY = 500;
const TERMINAL_STATUSES = new Set(["confirmed", "refused"]);

export type ResourceKind = RealtimeEvent["resource"]["kind"];

export type EventStore = {
  reset: (userId: string | null) => void;
  seed: (kind: ResourceKind, id: string, version: number, status?: string) => void;
  accept: (event: RealtimeEvent) => boolean;
};

export function createEventStore(capacity = DEFAULT_CAPACITY): EventStore {
  let userId: string | null = null;
  let appliedIds = new Set<string>();
  let versions = new Map<string, number>();
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
      appliedIds = new Set();
      versions = new Map();
      terminalOrders = new Set();
    },

    seed(kind, id, version, status) {
      raiseVersion(resourceKey(kind, id), version);
      if (kind === "order" && status && TERMINAL_STATUSES.has(status)) terminalOrders.add(id);
    },

    accept(event) {
      const key = resourceKey(event.resource.kind, event.resource.id);
      if (appliedIds.has(event.id)) return false;
      if (event.version <= (versions.get(key) ?? -1)) return false;
      if (event.audience && event.audience.userId !== userId) return false;
      if (event.type === "order.updated" && terminalOrders.has(event.resource.id)) return false;

      remember(event.id);
      raiseVersion(key, event.version);
      if (event.type === "order.updated" && TERMINAL_STATUSES.has(event.data.status)) {
        terminalOrders.add(event.resource.id);
      }
      return true;
    },
  };
}

export const eventStore = createEventStore();
