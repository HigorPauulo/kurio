import type { UserId } from "@/contracts/common";
import { emptyTables, type Tables } from "./tables";

export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = `kurio:mockdb:v${SCHEMA_VERSION}`;

const DEFAULT_SNAPSHOT_BUDGET = 1_000_000;
const QUOTE_GRACE_MS = 60_000;
const SESSION_GRACE_MS = 60 * 60_000;

export type EventType = "nft.updated" | "order.updated";

export type PendingEvent = {
  type: EventType;
  resourceId: string;
  audience: { userId: UserId } | null;
  data: unknown;
};

export type MockDbEvent = {
  id: string;
  type: EventType;
  resource: { kind: "nft" | "order"; id: string };
  version: number;
  audience: { userId: UserId } | null;
  occurredAt: string;
  data: unknown;
};

export type CommitContext = {
  emit: (event: PendingEvent) => void;
  nextId: (prefix: string) => string;
  now: () => Date;
};

export type SnapshotStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export type MockDbOptions = {
  seed: () => Tables;
  storage?: SnapshotStorage | null;
  now?: () => number;
  snapshotBudget?: number;
};

export type MockDb = {
  read: <Result>(reader: (tables: Readonly<Tables>) => Result) => Result;
  commit: (writer: (draft: Tables, context: CommitContext) => void) => MockDbEvent[];
  subscribe: (listener: (events: MockDbEvent[]) => void) => () => void;
  reset: () => void;
};

export class MockDbError extends Error {
  readonly code: "VALIDATION_FAILED" | "INVARIANT_VIOLATION";

  constructor(code: MockDbError["code"], message: string) {
    super(message);
    this.name = "MockDbError";
    this.code = code;
  }
}

type Versioned = { version: number };

function bumpChangedVersions<Row extends Versioned>(
  previous: Record<string, Row>,
  next: Record<string, Row>,
): void {
  for (const [id, row] of Object.entries(next)) {
    const before = previous[id];
    if (before && JSON.stringify(before) !== JSON.stringify(row)) {
      row.version = before.version + 1;
    }
  }
}

function collectGarbage(draft: Tables, nowMs: number): void {
  for (const [id, quote] of Object.entries(draft.quotes)) {
    if (!quote.usedByOrderId && Date.parse(quote.expiresAt) + QUOTE_GRACE_MS < nowMs) {
      delete draft.quotes[id];
    }
  }
  for (const [token, session] of Object.entries(draft.sessions)) {
    if (Date.parse(session.expiresAt) + SESSION_GRACE_MS < nowMs) delete draft.sessions[token];
  }
}

function assertInvariants(draft: Tables): void {
  for (const nft of Object.values(draft.nfts)) {
    for (const edition of nft.editions) {
      if (edition.available < 0 || edition.available > edition.supply) {
        throw new MockDbError(
          "INVARIANT_VIOLATION",
          `Disponibilidade fora do estoque em ${nft.id}/${edition.id}.`,
        );
      }
    }
  }
  for (const cart of Object.values(draft.carts)) {
    if (cart.items.some((item) => item.quantity < 1)) {
      throw new MockDbError("INVARIANT_VIOLATION", `Item com quantidade inválida em ${cart.id}.`);
    }
  }
}

const TABLE_NAMES = Object.keys(emptyTables()) as (keyof Tables)[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSnapshot(value: unknown): value is { schemaVersion: number; tables: Tables } {
  if (!isRecord(value) || !isRecord(value.tables)) return false;
  const { tables } = value;
  return (
    TABLE_NAMES.every((name) => isRecord(tables[name])) &&
    isRecord(tables.meta) &&
    typeof tables.meta.sequence === "number"
  );
}

function carryVersions<Row extends Versioned>(
  previous: Record<string, Row>,
  next: Record<string, Row>,
): void {
  for (const [id, row] of Object.entries(next)) {
    const before = previous[id];
    if (before) row.version = before.version + 1;
  }
}

export function createMockDb(options: MockDbOptions): MockDb {
  const {
    seed,
    storage = null,
    now = () => Date.now(),
    snapshotBudget = DEFAULT_SNAPSHOT_BUDGET,
  } = options;
  const listeners = new Set<(events: MockDbEvent[]) => void>();

  function load(): Tables | null {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      return isSnapshot(parsed) && parsed.schemaVersion === SCHEMA_VERSION ? parsed.tables : null;
    } catch {
      return null;
    }
  }

  function persist(tables: Tables): void {
    if (!storage) return;
    const raw = JSON.stringify({ schemaVersion: SCHEMA_VERSION, tables });
    if (raw.length > snapshotBudget) {
      throw new MockDbError("VALIDATION_FAILED", "O banco simulado excedeu o orçamento de armazenamento.");
    }
    try {
      storage.setItem(STORAGE_KEY, raw);
    } catch (error) {
      globalThis.reportError?.(error);
    }
  }

  let state: Tables = load() ?? seed();

  function toEvent(draft: Tables, pending: PendingEvent, occurredAt: string): MockDbEvent {
    const kind = pending.type === "nft.updated" ? "nft" : "order";
    const resource = kind === "nft" ? draft.nfts[pending.resourceId] : draft.orders[pending.resourceId];
    if (!resource) {
      throw new MockDbError("INVARIANT_VIOLATION", `Evento sem recurso: ${pending.resourceId}.`);
    }
    draft.meta.sequence += 1;
    return {
      id: `evt_${draft.meta.sequence}`,
      type: pending.type,
      resource: { kind, id: pending.resourceId },
      version: resource.version,
      audience: pending.audience,
      occurredAt,
      data: pending.data,
    };
  }

  return {
    read(reader) {
      return reader(state);
    },

    commit(writer) {
      const draft = structuredClone(state);
      const pending: PendingEvent[] = [];
      const nowMs = now();

      writer(draft, {
        emit: (event) => pending.push(event),
        nextId: (prefix) => {
          draft.meta.sequence += 1;
          return `${prefix}_${draft.meta.sequence}`;
        },
        now: () => new Date(nowMs),
      });

      bumpChangedVersions(state.nfts, draft.nfts);
      bumpChangedVersions(state.carts, draft.carts);
      bumpChangedVersions(state.orders, draft.orders);
      collectGarbage(draft, nowMs);
      assertInvariants(draft);

      const occurredAt = new Date(nowMs).toISOString();
      const events = pending.map((event) => toEvent(draft, event, occurredAt));
      persist(draft);

      state = draft;
      for (const listener of listeners) {
        try {
          listener(events);
        } catch (error) {
          globalThis.reportError?.(error);
        }
      }
      return events;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    reset() {
      const next = seed();
      next.meta.sequence = state.meta.sequence;
      carryVersions(state.nfts, next.nfts);
      carryVersions(state.carts, next.carts);
      carryVersions(state.orders, next.orders);
      state = next;
      storage?.removeItem(STORAGE_KEY);
    },
  };
}
