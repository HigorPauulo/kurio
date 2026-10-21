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
import { cartSchema } from "@/contracts/cart";
import { categorySchema, chainSchema } from "@/contracts/common";
import { nftSchema } from "@/contracts/nft";
import { userSchema } from "@/contracts/user";
import { createWalletBodySchema, walletSchema } from "@/contracts/wallet";
import { compareEth, minEth } from "@/lib/eth";
import { refreshNft } from "./nftUpdates";
import { verifyPassword } from "./password";
import { createSeed } from "./seed";

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
    tokenId: "#0001",
    likes: 0,
    rating: { average: 4, count: 1 },
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

  it("não deixa a falha de um inscrito derrubar o commit nem os outros inscritos", () => {
    const db = createDb();
    const received: string[] = [];
    db.subscribe(() => {
      throw new Error("inscrito com defeito");
    });
    db.subscribe((events) => received.push(...events.map((event) => event.id)));

    const events = db.commit((draft, { emit }) => {
      draft.nfts.nft_a.likes = 1;
      emit({ type: "nft.updated", resourceId: "nft_a", audience: null, data: {} });
    });

    expect(events).toHaveLength(1);
    expect(received).toEqual(["evt_1"]);
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

  it("apaga no boot o snapshot guardado na chave versionada antiga", () => {
    const oldKey = `kurio:mockdb:v${SCHEMA_VERSION - 1}`;
    storage.setItem(oldKey, JSON.stringify({ schemaVersion: SCHEMA_VERSION - 1, tables: emptyTables() }));

    createDb();

    expect(storage.getItem(oldKey)).toBeNull();
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

  it("reset continua a sequência de eventos e sobe as versões, para o cliente não descartar o que vem depois", () => {
    const db = createDb();
    const emitPrice = (): ReturnType<typeof db.commit> =>
      db.commit((draft, { emit }) => {
        draft.nfts.nft_a.likes += 1;
        emit({ type: "nft.updated", resourceId: "nft_a", audience: null, data: {} });
      });

    const [before] = emitPrice();
    db.reset();
    const [after] = emitPrice();

    expect(after.id).not.toBe(before.id);
    expect(after.version).toBeGreaterThan(before.version);
  });

  it("descarta snapshot sem alguma das tabelas e usa o seed", () => {
    const withoutQuotes: Partial<Tables> = emptyTables();
    delete withoutQuotes.quotes;
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, tables: withoutQuotes }));

    const db = createDb();

    expect(Object.keys(db.read((tables) => tables.nfts))).toEqual(["nft_a", "nft_b"]);
    expect(() => db.commit((draft) => void draft)).not.toThrow();
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
  it("remove cotação vencida sem pedido e sessão vencida há mais de 1 h, e mantém o resto", () => {
    const db = createDb();
    const twoMinutesAgo = new Date(NOW - 120_000).toISOString();
    const twoHoursAgo = new Date(NOW - 2 * 60 * 60_000).toISOString();
    const thirtySecondsAgo = new Date(NOW - 30_000).toISOString();

    db.commit((draft) => {
      draft.quotes.qte_old = makeQuote("qte_old", twoMinutesAgo, null);
      draft.quotes.qte_used = makeQuote("qte_used", twoMinutesAgo, "ord_1");
      draft.quotes.qte_grace = makeQuote("qte_grace", thirtySecondsAgo, null);
      draft.sessions.old = { token: "old", userId: "usr_1", expiresAt: twoHoursAgo };
      draft.sessions.recent = { token: "recent", userId: "usr_1", expiresAt: twoMinutesAgo };
      draft.sessions.active = {
        token: "active",
        userId: "usr_1",
        expiresAt: new Date(NOW + 60_000).toISOString(),
      };
    });

    expect(Object.keys(db.read((tables) => tables.quotes)).sort()).toEqual(["qte_grace", "qte_used"]);
    expect(Object.keys(db.read((tables) => tables.sessions)).sort()).toEqual(["active", "recent"]);
  });
});

describe("seed", () => {
  const tables = createSeed();
  const nfts = Object.values(tables.nfts);
  const editions = nfts.flatMap((nft) => nft.editions);

  it("todo registro obedece aos contratos", () => {
    for (const nft of nfts) expect(nftSchema.safeParse(nft).error).toBeUndefined();
    for (const user of Object.values(tables.users)) {
      expect(userSchema.safeParse(user).error).toBeUndefined();
    }
    for (const wallet of Object.values(tables.wallets)) {
      expect(walletSchema.safeParse(wallet).error).toBeUndefined();
      expect(createWalletBodySchema.safeParse(wallet).error).toBeUndefined();
    }
    for (const cart of Object.values(tables.carts)) {
      expect(cartSchema.safeParse(cart).error).toBeUndefined();
    }
  });

  it("tem 24 NFTs em duas páginas, com todas as categorias e redes", () => {
    expect(nfts.map((nft) => nft.id)).toEqual(
      Array.from({ length: 24 }, (_, index) => `nft_${String(index + 1).padStart(3, "0")}`),
    );
    expect(new Set(nfts.map((nft) => nft.category))).toEqual(new Set(categorySchema.options));
    expect(new Set(nfts.map((nft) => nft.chain))).toEqual(new Set(chainSchema.options));
  });

  it("vai de 0.001 a 12.5 ETH, com no máximo 6 casas, e priceFrom é o menor preço", () => {
    const prices = editions.map((edition) => edition.price);
    expect(prices.reduce(minEth)).toBe("0.001");
    expect(prices.reduce((max, price) => (compareEth(price, max) > 0 ? price : max))).toBe("12.5");
    expect(prices.every((price) => (price.split(".")[1] ?? "").length <= 6)).toBe(true);
    for (const nft of nfts) {
      expect(nft.priceFrom).toBe(nft.editions.map((edition) => edition.price).reduce(minEth));
    }
  });

  it("agrupa as fixtures em quatro coleções com ID em slug", () => {
    const collectionIds = new Set(nfts.map((nft) => nft.collection.id));
    expect(collectionIds).toEqual(new Set(["col_kurio-apes", "col_kurio-nomads", "col_kurio-barons", "col_kurio-golden"]));
    expect([...collectionIds].every((id) => /^col_[a-z0-9]+(-[a-z0-9]+)*$/.test(id))).toBe(true);
  });

  it("calcula status e priceFrom com as mesmas regras do servidor", () => {
    for (const nft of nfts) {
      const recalculated = structuredClone(nft);
      refreshNft(recalculated);
      expect(recalculated).toEqual(nft);
    }
  });

  it("cobre esgotados, indisponíveis, limite por pedido e destaques", () => {
    const soldOutNfts = nfts.filter((nft) => nft.editions.every((edition) => edition.available === 0));
    expect(soldOutNfts.length).toBeGreaterThanOrEqual(3);
    expect(editions.filter((edition) => edition.status === "unavailable").length).toBeGreaterThanOrEqual(2);
    expect(editions.some((edition) => edition.maxPerOrder < edition.available)).toBe(true);
    const featured = nfts.filter((nft) => nft.featured).length;
    expect(featured).toBeGreaterThan(0);
    expect(featured).toBeLessThanOrEqual(6);
  });

  it("tem Ana com carteiras, favoritos e carrinho, Bruno sem carteiras e Carla sem Nome ENS", () => {
    const walletsOf = (userId: string): number =>
      Object.values(tables.wallets).filter((wallet) => wallet.userId === userId).length;
    expect(walletsOf("usr_ana")).toBe(2);
    expect(walletsOf("usr_bruno")).toBe(0);
    expect(tables.users.usr_carla.ensName).toBeNull();
    expect(tables.favorites.usr_ana.every((id) => id in tables.nfts)).toBe(true);
  });

  it("monta o carrinho só com edições existentes e dentro do limite", () => {
    for (const item of tables.carts.usr_ana.items) {
      const edition = tables.nfts[item.nftId].editions.find((e) => e.id === item.editionId);
      expect(edition).toBeDefined();
      expect(item.quantity).toBeLessThanOrEqual(Math.min(edition!.available, edition!.maxPerOrder));
      expect(item.unitPrice).toBe(edition!.price);
    }
  });

  it("guarda senha só como hash PBKDF2 que confere com a senha das credenciais", async () => {
    expect(JSON.stringify(tables)).not.toContain("Kurio@2026");
    for (const user of Object.values(tables.users)) {
      await expect(verifyPassword("Kurio@2026", user.salt, user.passwordHash)).resolves.toBe(true);
      await expect(verifyPassword("senha-errada1", user.salt, user.passwordHash)).resolves.toBe(false);
    }
  });

  it("devolve uma cópia nova a cada chamada", () => {
    const first = createSeed();
    first.nfts.nft_001.likes = 0;
    expect(createSeed().nfts.nft_001.likes).toBe(412);
  });
});
