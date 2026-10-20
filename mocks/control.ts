import { cartSchema, type Cart } from "@/contracts/cart";
import { ethAmountSchema } from "@/contracts/common";
import { orderSchema, type Order } from "@/contracts/order";
import { refreshNft, nftUpdatedData } from "./db/nftUpdates";
import type { MockDb } from "./db/mockDb";
import type { Tables } from "./db/tables";
import type { LoggedRequest, NetworkConditions } from "./network/conditions";
import type { RealtimeServer, RealtimeStats } from "./realtime/server";
import { parseScenario } from "./scenarios/selection";
import type { PresetName } from "./scenarios/presets";

export type KurioControl = {
  reset: () => void;
  scenario: { get: () => string; set: (presets: string) => void };
  catalog: {
    setPrice: (nftId: string, editionId: string, price: string) => void;
    setAvailable: (nftId: string, editionId: string, available: number) => void;
  };
  sessions: { expire: (userId?: string) => void };
  realtime: {
    dropConnections: (options?: { reconnectAfterMs?: number }) => void;
    stats: () => RealtimeStats;
  };
  inspect: {
    orders: () => Order[];
    cart: (owner: string) => Cart | null;
    lastRequest: (pattern: string) => LoggedRequest | null;
  };
  build: string;
};

declare global {
  interface Window {
    __kurio?: KurioControl;
  }
}

export type KurioControlDeps = {
  db: MockDb;
  conditions: NetworkConditions;
  getScenarioNames: () => PresetName[];
  setScenarioNames: (names: PresetName[]) => void;
  defaultScenarioNames: PresetName[];
  realtime: Pick<RealtimeServer, "dropConnections" | "stats">;
  build: string;
};

function findEdition(draft: Tables, nftId: string, editionId: string) {
  const nft = draft.nfts[nftId];
  const edition = nft?.editions.find((candidate) => candidate.id === editionId);
  if (!nft || !edition) throw new Error(`Edição inexistente: ${nftId}/${editionId}.`);
  return { nft, edition };
}

export function createControl({
  db,
  conditions,
  getScenarioNames,
  setScenarioNames,
  defaultScenarioNames,
  realtime,
  build,
}: KurioControlDeps): KurioControl {
  function updateEdition(nftId: string, editionId: string, apply: (edition: ReturnType<typeof findEdition>["edition"]) => void): void {
    db.commit((draft, { emit }) => {
      const { nft, edition } = findEdition(draft, nftId, editionId);
      apply(edition);
      refreshNft(nft);
      emit({ type: "nft.updated", resourceId: nft.id, audience: null, data: nftUpdatedData(nft) });
    });
  }

  return {
    reset() {
      db.reset();
      setScenarioNames(defaultScenarioNames);
      conditions.reset();
    },

    scenario: {
      get: () => getScenarioNames().join("+"),
      set(presets) {
        const names = parseScenario(presets);
        if (!names) throw new Error(`Cenário inválido: ${presets}.`);
        setScenarioNames(names);
        conditions.reset();
      },
    },

    catalog: {
      setPrice(nftId, editionId, price) {
        const parsed = ethAmountSchema.parse(price);
        updateEdition(nftId, editionId, (edition) => {
          edition.price = parsed;
        });
      },
      setAvailable(nftId, editionId, available) {
        if (!Number.isInteger(available) || available < 0) {
          throw new Error(`Disponibilidade inválida: ${available}.`);
        }
        updateEdition(nftId, editionId, (edition) => {
          edition.available = available;
        });
      },
    },

    sessions: {
      expire(userId) {
        db.commit((draft, { now }) => {
          const expiredAt = new Date(now().getTime() - 1).toISOString();
          for (const session of Object.values(draft.sessions)) {
            if (!userId || session.userId === userId) session.expiresAt = expiredAt;
          }
        });
      },
    },

    realtime: {
      dropConnections: (options) => realtime.dropConnections(options),
      stats: () => realtime.stats(),
    },

    inspect: {
      orders: () =>
        db.read((tables) => Object.values(tables.orders).map((order) => orderSchema.parse(order))),
      cart: (owner) =>
        db.read((tables) => {
          const record = tables.carts[owner];
          return record ? cartSchema.parse(record) : null;
        }),
      lastRequest: (pattern) => conditions.lastRequest(pattern),
    },

    build,
  };
}
