import { beforeEach, describe, expect, it } from "vitest";
import type { EthAmount } from "@/contracts/common";
import type { Nft } from "@/contracts/nft";
import {
  createMockDb,
  MockDbError,
  SCHEMA_VERSION,
  STORAGE_KEY,
  type SnapshotStorage,
} from "./mockDb";
import { emptyTables, type QuoteRecord, type Tables } from "./tables";

const NOW = Date.parse("2026-10-19T12:00:00.000Z");
const eth = (value: string): EthAmount => value as EthAmount;

function makeNft(id: string): Nft {
  return {
    id,
    name: `NFT ${id}`,
    description: "",
    collection: { id: "col_1", name: "Coleção" },
    creator: { id: "cre_1", name: "Criadora", avatarUrl: "/a.webp" },
    category: "music",
    chain: "ethereum",
    images: [{ url: "/n.webp", alt: "NFT", width: 600, height: 600 }],
    editions: [
      {
        id: `ed_${id}`,
        label: "Edição 1",
        price: eth("0.5"),
        available: 3,
        supply: 5,
        maxPerOrder: 2,
        status: "available",
      },
    ],
    priceFrom: eth("0.5"),
    featured: false,
    likes: 0,
    createdAt: "2026-10-01T00:00:00.000Z",
    version: 0,
  };
}

function makeQuote(id: string, expiresAt: string, usedByOrderId: string | null): QuoteRecord {
  return {
    id,
    cartId: "crt_1",
    cartVersion: 0,
    network: "ethereum",
    lines: [],
    coupon: null,
    subtotal: eth("0"),
    discount: eth("0"),
    networkFee: eth("0"),
    total: eth("0"),
    issues: [],
    purchasable: true,
    basisHash: "hash",
    createdAt: "2026-10-19T11:00:00.000Z",
    expiresAt,
    owner: "usr_1",
    usedByOrderId,
  };
}

function seed(): Tables {
  const tables = emptyTables();
  tables.nfts.nft_a = makeNft("nft_a");
  tables.nfts.nft_b = makeNft("nft_b");
  return tables;
}

class MemoryStorage implements SnapshotStorage {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
});

function createDb(snapshotBudget?: number): ReturnType<typeof createMockDb> {
  return createMockDb({ seed, storage, now: () => NOW, snapshotBudget });
}

describe("commit", () => {
  it("aplica a escrita e devolve os eventos com ID determinístico e a versão nova", () => {
    const db = createDb();

    const events = db.commit((draft, { emit }) => {
      draft.nfts.nft_a.editions[0].available = 2;
      emit({ type: "nft.updated", resourceId: "nft_a", audience: null, data: {} });
    });

    expect(db.read((tables) => tables.nfts.nft_a.editions[0].available)).toBe(2);
    expect(events).toEqual([
      {
        id: "evt_1",
        type: "nft.updated",
        resource: { kind: "nft", id: "nft_a" },
        version: 1,
        audience: null,
        occurredAt: new Date(NOW).toISOString(),
        data: {},
      },
    ]);
  });

  it("incrementa a versão só do registro que mudou", () => {
    const db = createDb();

    db.commit((draft) => {
      draft.nfts.nft_a.likes = 1;
    });

    expect(db.read((tables) => tables.nfts.nft_a.version)).toBe(1);
    expect(db.read((tables) => tables.nfts.nft_b.version)).toBe(0);
  });

  it("gera IDs em sequência determinística", () => {
    const db = createDb();
    const ids: string[] = [];

    db.commit((_draft, { nextId }) => {
      ids.push(nextId("ord"), nextId("qte"));
    });

    expect(ids).toEqual(["ord_1", "qte_2"]);
  });

  it("não deixa estado parcial quando a escrita falha no meio", () => {
    const db = createDb();

    expect(() =>
      db.commit((draft) => {
        draft.nfts.nft_a.likes = 99;
        throw new Error("falha no meio do commit");
      }),
    ).toThrow("falha no meio do commit");

    expect(db.read((tables) => tables.nfts.nft_a.likes)).toBe(0);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("recusa estoque fora do intervalo e mantém o estado anterior", () => {
    const db = createDb();

    expect(() =>
      db.commit((draft) => {
        draft.nfts.nft_a.editions[0].available = 6;
      }),
    ).toThrow(MockDbError);

    expect(db.read((tables) => tables.nfts.nft_a.editions[0].available)).toBe(3);
  });

  it("recusa evento sem o recurso correspondente", () => {
    const db = createDb();

    expect(() =>
      db.commit((_draft, { emit }) => {
        emit({ type: "order.updated", resourceId: "ord_x", audience: null, data: {} });
      }),
    ).toThrow(MockDbError);
  });

  it("avisa os inscritos com os eventos do commit e para depois de cancelar", () => {
    const db = createDb();
    const received: string[] = [];
    const unsubscribe = db.subscribe((events) => received.push(...events.map((e) => e.id)));

    db.commit((draft, { emit }) => {
      draft.nfts.nft_a.likes = 1;
      emit({ type: "nft.updated", resourceId: "nft_a", audience: null, data: {} });
    });
    unsubscribe();
    db.commit((draft, { emit }) => {
      draft.nfts.nft_a.likes = 2;
      emit({ type: "nft.updated", resourceId: "nft_a", audience: null, data: {} });
    });

    expect(received).toEqual(["evt_1"]);
  });
});

describe("persistência", () => {
  it("recarrega o estado salvo depois de cada commit", () => {
    createDb().commit((draft) => {
      draft.nfts.nft_a.likes = 7;
    });

    expect(createDb().read((tables) => tables.nfts.nft_a.likes)).toBe(7);
  });

  it("descarta snapshot de outra versão de schema ou ilegível e usa o seed", () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: SCHEMA_VERSION + 1, tables: emptyTables() }),
    );
    expect(Object.keys(createDb().read((tables) => tables.nfts))).toEqual(["nft_a", "nft_b"]);

    storage.setItem(STORAGE_KEY, "{corrompido");
    expect(Object.keys(createDb().read((tables) => tables.nfts))).toEqual(["nft_a", "nft_b"]);
  });

  it("recusa o commit que estoura o orçamento e mantém o estado anterior", () => {
    const db = createDb(100);

    expect(() =>
      db.commit((draft) => {
        draft.nfts.nft_a.likes = 1;
      }),
    ).toThrow(expect.objectContaining({ code: "VALIDATION_FAILED" }));

    expect(db.read((tables) => tables.nfts.nft_a.likes)).toBe(0);
  });

  it("reset restaura o seed e apaga o snapshot", () => {
    const db = createDb();
    db.commit((draft) => {
      draft.nfts.nft_a.likes = 5;
    });

    db.reset();

    expect(db.read((tables) => tables.nfts.nft_a.likes)).toBe(0);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });
});

describe("coleta", () => {
  it("remove cotação vencida sem pedido e sessão vencida, e mantém o resto", () => {
    const db = createDb();
    const twoMinutesAgo = new Date(NOW - 120_000).toISOString();
    const thirtySecondsAgo = new Date(NOW - 30_000).toISOString();

    db.commit((draft) => {
      draft.quotes.qte_old = makeQuote("qte_old", twoMinutesAgo, null);
      draft.quotes.qte_used = makeQuote("qte_used", twoMinutesAgo, "ord_1");
      draft.quotes.qte_grace = makeQuote("qte_grace", thirtySecondsAgo, null);
      draft.sessions.expired = { token: "expired", userId: "usr_1", expiresAt: twoMinutesAgo };
      draft.sessions.active = {
        token: "active",
        userId: "usr_1",
        expiresAt: new Date(NOW + 60_000).toISOString(),
      };
    });

    expect(Object.keys(db.read((tables) => tables.quotes)).sort()).toEqual(["qte_grace", "qte_used"]);
    expect(Object.keys(db.read((tables) => tables.sessions))).toEqual(["active"]);
  });
});
