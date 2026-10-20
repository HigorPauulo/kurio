import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMockDb } from "../db/mockDb";
import { settleOrder } from "../db/orders";
import { createSeed } from "../db/seed";
import { createNetworkConditions } from "../network/conditions";
import { buildScenario, type PresetName } from "../scenarios/presets";
import { authHandlers } from "./auth";
import { cartHandlers } from "./cart";
import { favoriteHandlers } from "./favorites";
import { meHandlers } from "./me";
import { orderHandlers } from "./orders";
import { nftHandlers } from "./nfts";
import type { HandlerDeps } from "./shared";
import { walletHandlers } from "./wallets";

const START = Date.parse("2026-10-19T12:00:00.000Z");
const PASSWORD = "Kurio@2026";

let nowMs = START;
const scheduled: string[] = [];
let scenarioNames: PresetName[] = ["fast"];
const db = createMockDb({ seed: createSeed, now: () => nowMs });

const deps: HandlerDeps = {
  db,
  conditions: createNetworkConditions({
    getScenario: () => buildScenario(scenarioNames),
    wait: () => Promise.resolve(),
  }),
  getScenario: () => buildScenario(scenarioNames),
  now: () => nowMs,
  wait: () => Promise.resolve(),
  orders: { schedule: (orderId) => scheduled.push(orderId), resume: () => undefined },
};

const server = setupServer(
  ...authHandlers(deps),
  ...nftHandlers(deps),
  ...favoriteHandlers(deps),
  ...cartHandlers(deps),
  ...orderHandlers(deps),
  ...meHandlers(deps),
  ...walletHandlers(deps),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  nowMs = START;
  scenarioNames = ["fast"];
  db.reset();
});
afterEach(() => server.resetHandlers());

type CallOptions = { token?: string; guest?: string; key?: string; body?: unknown; form?: FormData };

type ResponseBody = {
  [key: string]: unknown;
  error: { code: string; fieldErrors: Record<string, string[]> };
  user: { id: string };
  token: string;
  expiresAt: string;
  avatarUrl: string;
  connection: unknown;
};

async function call(method: string, path: string, { token, guest, key, body, form }: CallOptions = {}) {
  const headers: Record<string, string> = {};
  if (key) headers["Idempotency-Key"] = key;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (guest) headers["X-Guest-Cart-Id"] = guest;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`http://localhost/api${path}`, {
    method,
    headers,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await response.text();
  return { status: response.status, json: (text ? JSON.parse(text) : null) as ResponseBody };
}

async function login(email: string, password = PASSWORD): Promise<string> {
  const { json } = await call("POST", "/auth/login", { body: { email, password } });
  return json.token;
}

describe("sessão", () => {
  it("cadastra com username como nome, sem Nome ENS, e guarda só o hash da senha", async () => {
    const { status, json } = await call("POST", "/auth/register", {
      body: { username: "dani", email: "Dani@Kurio.TEST", password: "Senha123" },
    });

    expect(status).toBe(201);
    expect(json.user).toMatchObject({ username: "dani", name: "dani", email: "dani@kurio.test", ensName: null });
    expect(JSON.stringify(db.read((tables) => tables.users))).not.toContain("Senha123");
  });

  it("recusa e-mail e username em uso, com o erro no campo", async () => {
    const email = await call("POST", "/auth/register", {
      body: { username: "nova", email: "ana@kurio.test", password: "Senha123" },
    });
    const username = await call("POST", "/auth/register", {
      body: { username: "carla", email: "nova@kurio.test", password: "Senha123" },
    });

    expect(email.status).toBe(409);
    expect(email.json.error).toMatchObject({ code: "EMAIL_TAKEN", fieldErrors: { email: [expect.any(String)] } });
    expect(username.json.error).toMatchObject({ code: "USERNAME_TAKEN", fieldErrors: { username: [expect.any(String)] } });
  });

  it("responde 422 com erro por campo quando o corpo é inválido", async () => {
    const { status, json } = await call("POST", "/auth/register", {
      body: { username: "A!", email: "x", password: "curta" },
    });

    expect(status).toBe(422);
    expect(Object.keys(json.error.fieldErrors).sort()).toEqual(["email", "password", "username"]);
  });

  it("faz login, devolve a sessão atual e recusa senha errada", async () => {
    const wrong = await call("POST", "/auth/login", { body: { email: "ana@kurio.test", password: "Errada123" } });
    const token = await login("ana@kurio.test");
    const session = await call("GET", "/auth/session", { token });

    expect(wrong.json.error.code).toBe("INVALID_CREDENTIALS");
    expect(session.status).toBe(200);
    expect(session.json.user.id).toBe("usr_ana");
  });

  it("distingue token desconhecido, token vencido e token encerrado no logout", async () => {
    const unknown = await call("GET", "/me", { token: "tok_inventado" });
    const token = await login("ana@kurio.test");
    nowMs += buildScenario(["fast"]).sessionTtlMs + 1;
    const expired = await call("GET", "/me", { token });

    nowMs = START;
    const fresh = await login("bruno@kurio.test");
    await call("POST", "/auth/logout", { token: fresh });
    const loggedOut = await call("GET", "/me", { token: fresh });

    expect(unknown.json.error.code).toBe("UNAUTHENTICATED");
    expect(expired.json.error.code).toBe("SESSION_EXPIRED");
    expect(loggedOut.json.error.code).toBe("UNAUTHENTICATED");
  });

  it("usa a validade do cenário session-short", async () => {
    scenarioNames = ["fast", "session-short"];
    const { json } = await call("POST", "/auth/login", { body: { email: "ana@kurio.test", password: PASSWORD } });

    expect(Date.parse(json.expiresAt) - nowMs).toBe(60_000);
  });
});

describe("perfil", () => {
  it("atualiza o perfil gravando o Nome ENS com .eth e recusa username de outro usuário", async () => {
    const token = await login("carla@kurio.test");
    const updated = await call("PATCH", "/me", { token, body: { name: "Carla S.", ensName: "Carla" } });
    const taken = await call("PATCH", "/me", { token, body: { username: "ana" } });

    expect(updated.json).toMatchObject({ name: "Carla S.", ensName: "carla.eth" });
    expect(taken.json.error).toMatchObject({ code: "USERNAME_TAKEN", fieldErrors: { username: [expect.any(String)] } });
  });

  it("troca a senha só com a senha atual certa, e a nova passa a valer no login", async () => {
    const token = await login("bruno@kurio.test");
    const wrong = await call("POST", "/me/password", {
      token,
      body: { currentPassword: "Errada123", newPassword: "NovaSenha1" },
    });
    const changed = await call("POST", "/me/password", {
      token,
      body: { currentPassword: PASSWORD, newPassword: "NovaSenha1" },
    });

    expect(wrong.json.error).toMatchObject({ code: "WRONG_PASSWORD", fieldErrors: { currentPassword: [expect.any(String)] } });
    expect(changed.status).toBe(204);
    expect(await login("bruno@kurio.test", "NovaSenha1")).toMatch(/^tok_/);
  });

  it("aceita avatar pequeno de tipo permitido e recusa o grande ou de outro tipo", async () => {
    const token = await login("ana@kurio.test");
    const upload = (bytes: number, type: string) => {
      const form = new FormData();
      form.set("file", new File([new Uint8Array(bytes)], "avatar", { type }));
      return call("POST", "/me/avatar", { token, form });
    };

    const ok = await upload(1_000, "image/webp");
    const big = await upload(32_001, "image/webp");
    const gif = await upload(1_000, "image/gif");

    expect(ok.json.avatarUrl).toMatch(/^data:image\/webp;base64,/);
    expect(big.json.error.fieldErrors.file).toBeDefined();
    expect(gif.json.error.fieldErrors.file).toBeDefined();
  });

  it("recusa avatar quando a cota do ambiente acaba, sem travar o resto do banco", async () => {
    const statuses: number[] = [];
    for (let index = 0; index < 12; index += 1) {
      const { json } = await call("POST", "/auth/register", {
        body: { username: `user${index}`, email: `user${index}@kurio.test`, password: "Senha123" },
      });
      const form = new FormData();
      form.set("file", new File([new Uint8Array(32_000)], "avatar", { type: "image/png" }));
      statuses.push((await call("POST", "/me/avatar", { token: json.token, form })).status);
    }

    expect(statuses).toContain(200);
    expect(statuses.at(-1)).toBe(422);
    const persisted = db.read((tables) => JSON.stringify(tables).length);
    expect(persisted).toBeLessThan(600_000);
    expect(await login("ana@kurio.test")).toMatch(/^tok_/);
  });
});

describe("carteiras", () => {
  const newWallet = {
    role: "primary",
    label: "Minha carteira",
    provider: "walletconnect",
    address: `0x${"b".repeat(40)}`,
    backupAddress: "",
    networks: ["base"],
    profileName: "Bruno colecionador",
    referralCode: "bruno26",
  };

  it("cadastra carteira e recusa papel ocupado e endereço já cadastrado", async () => {
    const token = await login("bruno@kurio.test");
    const created = await call("POST", "/me/wallets", { token, body: newWallet });
    const sameRole = await call("POST", "/me/wallets", {
      token,
      body: { ...newWallet, address: `0x${"c".repeat(40)}` },
    });
    const sameAddress = await call("POST", "/me/wallets", {
      token,
      body: { ...newWallet, role: "secondary", address: "0x7a3B5c9E1d2F4a6B8c0D2e4F6a8B0c2D4e6F8a0B" },
    });

    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({ backupAddress: null, referralCode: "BRUNO26", connection: { status: "disconnected" } });
    expect(sameRole.json.error.fieldErrors.role).toBeDefined();
    expect(sameAddress.json.error.code).toBe("WALLET_ADDRESS_TAKEN");
  });

  it("troca os papéis das duas carteiras ao promover a secundária", async () => {
    const token = await login("ana@kurio.test");
    await call("PATCH", "/me/wallets/wal_ana_2", { token, body: { role: "primary" } });
    const { json } = await call("GET", "/me/wallets", { token });

    const roles = Object.fromEntries((json as unknown as { id: string; role: string }[]).map((w) => [w.id, w.role]));
    expect(roles).toEqual({ wal_ana_1: "secondary", wal_ana_2: "primary" });
  });

  it("conecta só em rede suportada, recusa no wallet-reject e esconde carteira de outro usuário", async () => {
    const token = await login("ana@kurio.test");
    const wrongNetwork = await call("POST", "/me/wallets/wal_ana_1/connection", { token, body: { network: "polygon" } });
    const connected = await call("POST", "/me/wallets/wal_ana_1/connection", { token, body: { network: "base" } });
    scenarioNames = ["fast", "wallet-reject"];
    const rejected = await call("POST", "/me/wallets/wal_ana_2/connection", { token, body: { network: "polygon" } });
    const brunoToken = await login("bruno@kurio.test");
    const foreign = await call("PATCH", "/me/wallets/wal_ana_1", { token: brunoToken, body: { label: "Minha" } });

    expect(wrongNetwork.json.error.fieldErrors.network).toBeDefined();
    expect(connected.json.connection).toEqual({ status: "connected", network: "base" });
    expect(rejected.json.error.code).toBe("WALLET_REJECTED");
    expect(foreign.status).toBe(404);
  });
});

type ListBody = {
  items: { id: string; name: string; priceFrom: string; status: string; category: string; chain: string }[];
  total: number;
  totalPages: number;
  appliedQuery: Record<string, unknown>;
  facets: {
    category: Record<string, number>;
    chain: Record<string, number>;
    price: { min: string; max: string } | null;
  };
};

async function list(search: string): Promise<{ status: number; body: ListBody }> {
  const { status, json } = await call("GET", `/nfts${search}`);
  return { status, body: json as unknown as ListBody };
}

describe("catálogo", () => {
  it("pagina por 12, ordena por recente com desempate por id e devolve página vazia além do fim", async () => {
    const first = await list("");
    expect(first.body.total).toBe(24);
    expect(first.body.totalPages).toBe(2);
    expect(first.body.items).toHaveLength(12);
    expect(first.body.items[0].id).toBe("nft_024");

    const beyond = await list("?page=3");
    expect(beyond.body.items).toEqual([]);
    expect(beyond.body.total).toBe(24);
  });

  it("busca sem acento e sem caixa em nome, coleção e criador", async () => {
    const byCreator = await list("?q=IRIS");
    expect(byCreator.body.items.map((item) => item.name)).toContain("Neon Vessel #552");
    const byCollection = await list("?q=barons");
    expect(byCollection.body.items.map((item) => item.id).sort()).toEqual([
      "nft_003",
      "nft_004",
      "nft_011",
      "nft_015",
      "nft_019",
      "nft_024",
    ]);
  });

  it("combina filtros por AND, com OR dentro da lista, e ecoa a consulta normalizada", async () => {
    const { body } = await list("?category=music,gaming&chain=ethereum&status=available");
    expect(body.items.every((item) => ["music", "gaming"].includes(item.category))).toBe(true);
    expect(body.items.every((item) => item.chain === "ethereum" && item.status === "available")).toBe(true);
    expect(body.appliedQuery).toMatchObject({ category: ["music", "gaming"], chain: ["ethereum"], sort: "recent" });
  });

  it("filtra e ordena por preço com comparação exata", async () => {
    const { body } = await list("?priceMin=0.01&priceMax=0.1&sort=price_asc&pageSize=48");
    const prices = body.items.map((item) => item.priceFrom);
    expect(prices[0]).toBe("0.0125");
    expect(prices.at(-1)).toBe("0.075");
    expect(prices).not.toContain("0.009");
  });

  it("pagina as avaliações com resumo igual à nota agregada do NFT", async () => {
    const first = await call("GET", "/nfts/nft_001/reviews");
    const body = first.json as unknown as {
      items: { rating: number }[];
      total: number;
      totalPages: number;
      summary: { average: number; count: number; distribution: Record<string, number> };
    };
    expect(body.items).toHaveLength(5);
    expect(body.total).toBe(19);
    expect(body.totalPages).toBe(4);
    expect(body.summary).toMatchObject({ average: 4.5, count: 19 });
    expect(Object.values(body.summary.distribution).reduce((sum, count) => sum + count, 0)).toBe(19);

    const nft = (await call("GET", "/nfts/nft_001")).json as unknown as { rating: { average: number; count: number } };
    expect(nft.rating).toEqual({ average: 4.5, count: 19 });

    const last = (await call("GET", "/nfts/nft_001/reviews?page=4")).json as unknown as { items: unknown[]; page: number };
    expect(last.page).toBe(4);
    expect(last.items).toHaveLength(4);
    expect((await call("GET", "/nfts/nft_999/reviews")).status).toBe(404);
    expect((await call("GET", "/nfts/nft_001/reviews?pageSize=99")).status).toBe(400);
  });

  it("filtra por coleção", async () => {
    const { body } = await list("?collection=col_kurio-apes&pageSize=48");
    expect(body.items.map((item) => item.name).sort()).toEqual([
      "Emerald Ape #042",
      "Emerald Cube #880",
      "Emerald Drift #215",
      "Emerald Pass #303",
      "Emerald Relic #198",
    ]);
  });

  it("filtra a vista em alta pelos destaques e a de novos pelos 7 dias antes do lançamento mais recente", async () => {
    const trending = await list("?view=trending&pageSize=48");
    expect(trending.body.items.map((item) => item.id).sort()).toEqual(
      ["nft_001", "nft_002", "nft_003", "nft_006", "nft_015", "nft_019"].sort(),
    );

    const fresh = await list("?view=new&pageSize=48");
    expect(fresh.body.total).toBe(8);
    expect(fresh.body.items[0].id).toBe("nft_024");
    expect(fresh.body.items.at(-1)?.id).toBe("nft_017");
    expect((await list("?view=viral")).status).toBe(400);
  });

  it("conta cada faceta sem o próprio filtro e dá a faixa de preço sem o filtro de preço", async () => {
    const { body } = await list("?category=music&priceMax=1");
    expect(body.total).toBe(1);
    expect(body.facets.category).toMatchObject({ music: 1, "digital-art": 1, gaming: 3 });
    expect(Object.keys(body.facets.category)).toHaveLength(9);

    const music = await list("?category=music");
    expect(music.body.facets.chain).toEqual({ ethereum: 1, polygon: 1, base: 1 });
    expect(music.body.facets.price).toEqual({ min: "0.06", max: "12.5" });
    expect((await list("?category=music&priceMax=1")).body.facets.price).toEqual({ min: "0.06", max: "12.5" });

    scenarioNames = ["fast", "empty-catalog"];
    expect((await list("")).body.facets.price).toBeNull();
  });

  it("responde 400 para parâmetro fora das listas ou preço mínimo acima do máximo", async () => {
    expect((await list("?category=arte")).status).toBe(400);
    expect((await list("?priceMin=5&priceMax=1")).status).toBe(400);
  });

  it("devolve vazio no empty-catalog, destaques até 6 e 404 para NFT inexistente", async () => {
    const featured = await call("GET", "/nfts/featured");
    expect((featured.json as unknown as unknown[]).length).toBeLessThanOrEqual(6);
    expect((await call("GET", "/nfts/nft_001")).json).toMatchObject({ id: "nft_001" });
    expect((await call("GET", "/nfts/nft_999")).status).toBe(404);

    scenarioNames = ["fast", "empty-catalog"];
    expect((await list("")).body.total).toBe(0);
    expect((await call("GET", "/nfts/nft_001")).status).toBe(404);
    const token = await login("ana@kurio.test");
    expect((await call("PUT", "/me/favorites/nft_001", { token })).status).toBe(404);
  });
});

describe("favoritos", () => {
  it("favorita e desfavorita de forma idempotente, mexendo em likes só quando o estado muda", async () => {
    const token = await login("ana@kurio.test");
    const likes = () => db.read((tables) => tables.nfts.nft_001.likes);
    const before = likes();

    expect((await call("PUT", "/me/favorites/nft_001", { token })).status).toBe(204);
    await call("PUT", "/me/favorites/nft_001", { token });
    expect(likes()).toBe(before + 1);
    expect((await call("GET", "/me/favorites", { token })).json).toEqual({ nftIds: ["nft_002", "nft_015", "nft_001"] });

    await call("DELETE", "/me/favorites/nft_001", { token });
    await call("DELETE", "/me/favorites/nft_001", { token });
    expect(likes()).toBe(before);
  });

  it("exige sessão, responde 404 para NFT inexistente e não mistura usuários", async () => {
    expect((await call("GET", "/me/favorites")).status).toBe(401);
    const token = await login("bruno@kurio.test");
    expect((await call("PUT", "/me/favorites/nft_999", { token })).status).toBe(404);
    expect((await call("GET", "/me/favorites", { token })).json).toEqual({ nftIds: [] });
  });
});

const GUEST = "6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b";

type CartBody = {
  id: string;
  version: number;
  coupon: { code: string } | null;
  items: { id: string; editionId: string; quantity: number; status: string; available: number; unitPrice: string }[];
};

type QuoteBody = {
  subtotal: string;
  discount: string;
  networkFee: string;
  total: string;
  purchasable: boolean;
  issues: { kind: string }[];
  lines: { lineTotal: string }[];
};

describe("carrinho", () => {
  it("exige identificador do visitante e cria o carrinho vazio no primeiro GET", async () => {
    expect((await call("GET", "/cart")).status).toBe(400);
    const { status, json } = await call("GET", "/cart", { guest: GUEST });
    expect(status).toBe(200);
    expect((json as unknown as CartBody).items).toEqual([]);
  });

  it("soma a mesma edição e recusa passar de min(available, maxPerOrder) com os detalhes", async () => {
    await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_001", editionId: "ed_001_1", quantity: 2 } });
    const added = await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_001", editionId: "ed_001_1", quantity: 1 } });
    const cart = added.json as unknown as CartBody;
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);

    const over = await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_001", editionId: "ed_001_1", quantity: 1 } });
    expect(over.status).toBe(409);
    expect(over.json.error).toMatchObject({ code: "AVAILABILITY_CONFLICT", details: { editionId: "ed_001_1", available: 8, maxPerOrder: 3 } });

    const blocked = await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_004", editionId: "ed_004_2", quantity: 1 } });
    expect(blocked.status).toBe(409);
  });

  it("altera e remove itens, com remoção idempotente e versão crescente", async () => {
    const created = (await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_012", editionId: "ed_012_1", quantity: 1 } }))
      .json as unknown as CartBody;
    const itemId = created.items[0].id;

    expect((await call("PATCH", `/cart/items/${itemId}`, { guest: GUEST, body: { quantity: 7 } })).status).toBe(409);
    const patched = (await call("PATCH", `/cart/items/${itemId}`, { guest: GUEST, body: { quantity: 6 } })).json as unknown as CartBody;
    expect(patched.items[0].quantity).toBe(6);
    expect(patched.version).toBeGreaterThan(created.version);

    expect(((await call("DELETE", `/cart/items/${itemId}`, { guest: GUEST })).json as unknown as CartBody).items).toEqual([]);
    expect((await call("DELETE", `/cart/items/${itemId}`, { guest: GUEST })).status).toBe(200);
  });

  it("recusa cupom inválido, expirado e abaixo do mínimo com códigos distintos", async () => {
    await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_014", editionId: "ed_014_1", quantity: 1 } });
    const codes = [];
    for (const code of ["NADA", "expirado", "FIXO005"]) {
      const { status, json } = await call("PUT", "/cart/coupon", { guest: GUEST, body: { code } });
      expect(status).toBe(422);
      codes.push(json.error.code);
    }
    expect(codes).toEqual(["COUPON_INVALID", "COUPON_EXPIRED", "COUPON_MINIMUM_NOT_MET"]);
  });

  it("cota em wei exato: subtotal, desconto percentual com floor, taxa por item e total", async () => {
    const token = await login("ana@kurio.test");
    const plain = (await call("POST", "/quotes", { token, body: { network: "ethereum" } })).json as unknown as QuoteBody;
    expect(plain).toMatchObject({ subtotal: "0.87", discount: "0", networkFee: "0.0024", total: "0.8724", purchasable: true });

    await call("PUT", "/cart/coupon", { token, body: { code: "kurio10" } });
    const discounted = (await call("POST", "/quotes", { token, body: { network: "polygon" } })).json as unknown as QuoteBody;
    expect(discounted).toMatchObject({ discount: "0.087", networkFee: "0.00016", total: "0.78316" });
  });

  it("aponta preço alterado e esgotado na cotação e bloqueia a compra", async () => {
    const token = await login("ana@kurio.test");
    db.commit((draft) => {
      draft.nfts.nft_004.editions[0].price = "0.8" as never;
      draft.nfts.nft_012.editions[0].available = 0;
    });
    const quote = (await call("POST", "/quotes", { token, body: { network: "ethereum" } })).json as unknown as QuoteBody;
    expect(quote.issues.map((issue) => issue.kind).sort()).toEqual(["PRICE_CHANGED", "SOLD_OUT"]);
    expect(quote.purchasable).toBe(false);
    const cart = (await call("GET", "/cart", { token })).json as unknown as CartBody;
    expect(cart.items.map((item) => item.status)).toEqual(["price_changed", "sold_out"]);
  });

  it("recusa cotar carrinho vazio", async () => {
    expect((await call("POST", "/quotes", { guest: GUEST, body: { network: "ethereum" } })).status).toBe(422);
  });

  it("une o carrinho do visitante no login: limita, ajusta, leva o cupom e apaga o do visitante", async () => {
    await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_012", editionId: "ed_012_1", quantity: 6 } });
    await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_001", editionId: "ed_001_1", quantity: 1 } });
    await call("PUT", "/cart/coupon", { guest: GUEST, body: { code: "KURIO10" } });
    const token = await login("ana@kurio.test");

    const { json } = await call("POST", "/cart/merge", { token, body: { guestCartId: GUEST } });
    const merged = json as unknown as { cart: CartBody; adjustments: unknown[] };
    expect(merged.adjustments).toEqual([{ editionId: "ed_012_1", requested: 8, kept: 6 }]);
    expect(merged.cart.items.map((item) => [item.editionId, item.quantity])).toEqual([
      ["ed_004_1", 1],
      ["ed_012_1", 6],
      ["ed_001_1", 1],
    ]);
    expect(merged.cart.coupon).toEqual({ code: "KURIO10" });
    expect(db.read((tables) => tables.carts[`guest:${GUEST}`])).toBeUndefined();
    expect((await call("POST", "/cart/merge")).status).toBe(401);
  });

  it("aceita diminuir item acima do estoque, mas não aumentar", async () => {
    const token = await login("ana@kurio.test");
    db.commit((draft) => {
      draft.nfts.nft_012.editions[0].available = 1;
    });
    const before = (await call("GET", "/cart", { token })).json as unknown as CartBody;
    const item = before.items.find((candidate) => candidate.editionId === "ed_012_1");
    expect(item?.status).toBe("insufficient");

    expect((await call("PATCH", `/cart/items/${item?.id}`, { token, body: { quantity: 3 } })).status).toBe(409);
    const fixed = (await call("PATCH", `/cart/items/${item?.id}`, { token, body: { quantity: 1 } })).json as unknown as CartBody;
    expect(fixed.items.find((candidate) => candidate.id === item?.id)?.status).toBe("ok");
  });

  it("no merge, mantém o item esgotado do usuário e grava o preço atual no item alterado", async () => {
    await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_004", editionId: "ed_004_1", quantity: 1 } });
    await call("POST", "/cart/items", { guest: GUEST, body: { nftId: "nft_012", editionId: "ed_012_1", quantity: 1 } });
    db.commit((draft) => {
      draft.nfts.nft_004.editions[0].available = 0;
      draft.nfts.nft_012.editions[0].price = "0.07" as never;
    });
    const token = await login("ana@kurio.test");

    const { json } = await call("POST", "/cart/merge", { token, body: { guestCartId: GUEST } });
    const merged = json as unknown as { cart: CartBody; adjustments: unknown[] };
    expect(merged.adjustments).toEqual([{ editionId: "ed_004_1", requested: 2, kept: 1 }]);
    expect(merged.cart.items.map((item) => [item.editionId, item.quantity, item.status, item.unitPrice])).toEqual([
      ["ed_004_1", 1, "sold_out", "0.75"],
      ["ed_012_1", 3, "ok", "0.07"],
    ]);
  });
});

type OrderBody = {
  id: string;
  status: string;
  receipt: { total: string; lines: { editionId: string; quantity: number }[]; buyer: { ensName: string; note: string | null } };
  transaction: { hash: string; explorerUrl: string } | null;
  refusal: { reason: string } | null;
};

async function prepareCheckout(email = "ana@kurio.test"): Promise<{ token: string; quoteId: string }> {
  const token = await login(email);
  await call("POST", "/me/wallets/wal_ana_1/connection", { token, body: { network: "ethereum" } });
  const quote = await call("POST", "/quotes", { token, body: { network: "ethereum", purpose: "checkout" } });
  return { token, quoteId: (quote.json as unknown as { id: string }).id };
}

function orderBody(quoteId: string, note: string | null = "Presente") {
  return { quoteId, walletId: "wal_ana_1", network: "ethereum", note };
}

describe("pedidos", () => {
  beforeEach(() => {
    scheduled.length = 0;
  });

  it("exige a chave, cria pendente com reserva e agenda o desfecho", async () => {
    const { token, quoteId } = await prepareCheckout();
    expect((await call("POST", "/orders", { token, body: orderBody(quoteId) })).status).toBe(400);

    const created = await call("POST", "/orders", { token, key: "k1", body: orderBody(quoteId) });
    const order = created.json as unknown as OrderBody;
    expect(created.status).toBe(201);
    expect(order).toMatchObject({ status: "pending", receipt: { total: "0.8724", buyer: { ensName: "ana.eth", note: "Presente" } } });
    expect(scheduled).toEqual([order.id]);
    expect(db.read((tables) => tables.nfts.nft_012.editions[0].available)).toBe(28);
  });

  it("mesma chave devolve o mesmo pedido, mesmo com a cotação vencida; corpo diferente e cotação reusada são recusados", async () => {
    const { token, quoteId } = await prepareCheckout();
    const first = (await call("POST", "/orders", { token, key: "k1", body: orderBody(quoteId) })).json as unknown as OrderBody;
    nowMs += 10 * 60_000;

    const replay = await call("POST", "/orders", { token, key: "k1", body: orderBody(quoteId) });
    expect(replay.status).toBe(200);
    expect((replay.json as unknown as OrderBody).id).toBe(first.id);

    const conflict = await call("POST", "/orders", { token, key: "k1", body: orderBody(quoteId, "outra") });
    expect(conflict.json.error).toMatchObject({ code: "IDEMPOTENCY_CONFLICT", details: { orderId: first.id } });
    const reused = await call("POST", "/orders", { token, key: "k2", body: orderBody(quoteId) });
    expect(reused.json.error).toMatchObject({ code: "QUOTE_ALREADY_USED", details: { orderId: first.id } });

    nowMs = START;
    const fresh = (await call("POST", "/quotes", { token, body: { network: "ethereum", purpose: "checkout" } })).json as unknown as { id: string };
    const second = await call("POST", "/orders", { token, key: "k3", body: orderBody(fresh.id) });
    expect(second.json.error).toMatchObject({ code: "ORDER_PENDING", details: { orderId: first.id } });
    expect(db.read((tables) => Object.keys(tables.orders))).toHaveLength(1);
  });

  it("valida perfil, carteira, rede e conexão", async () => {
    const carla = await login("carla@kurio.test");
    const carlaOrder = await call("POST", "/orders", { token: carla, key: "c1", body: orderBody("qte_x") });
    expect(carlaOrder.json.error.fieldErrors).toHaveProperty("ensName");

    const token = await login("ana@kurio.test");
    const quote = (await call("POST", "/quotes", { token, body: { network: "ethereum" } })).json as unknown as { id: string };
    expect((await call("POST", "/orders", { token, key: "a1", body: { ...orderBody(quote.id), network: "polygon" } })).json.error.fieldErrors).toHaveProperty("network");
    expect((await call("POST", "/orders", { token, key: "a2", body: orderBody(quote.id) })).json.error.code).toBe("WALLET_NOT_CONNECTED");
  });

  it("recusa cotação velha com a nova nos detalhes, e cotação vencida", async () => {
    const { token, quoteId } = await prepareCheckout();
    db.commit((draft) => {
      draft.nfts.nft_004.editions[0].price = "0.8" as never;
    });
    const stale = await call("POST", "/orders", { token, key: "s1", body: orderBody(quoteId) });
    expect(stale.json.error.code).toBe("QUOTE_STALE");
    const fresh = (stale.json.error as unknown as { details: { quote: { id: string; total: string } } }).details.quote;
    expect(fresh.total).toBe("0.9224");

    nowMs += 6 * 60_000;
    expect((await call("POST", "/orders", { token, key: "s2", body: orderBody(fresh.id) })).json.error.code).toBe("QUOTE_EXPIRED");
  });

  it("confirmação baixa só o comprado do carrinho e grava a transação; recusa devolve o estoque", async () => {
    const { token, quoteId } = await prepareCheckout();
    const order = (await call("POST", "/orders", { token, key: "k1", body: orderBody(quoteId) })).json as unknown as OrderBody;
    await call("POST", "/cart/items", { token, body: { nftId: "nft_014", editionId: "ed_014_1", quantity: 1 } });

    expect(settleOrder(db, order.id, "confirmed")).toBe(true);
    expect(settleOrder(db, order.id, "refused")).toBe(false);
    const confirmed = (await call("GET", `/orders/${order.id}`, { token })).json as unknown as OrderBody;
    expect(confirmed.transaction?.explorerUrl).toMatch(/^https:\/\/etherscan\.io\/tx\/0x[0-9a-f]{64}$/);
    expect(db.read((tables) => tables.carts.usr_ana.items.map((item) => item.editionId))).toEqual(["ed_014_1"]);

    db.reset();
    const second = await prepareCheckout();
    const refused = (await call("POST", "/orders", { token: second.token, key: "k2", body: orderBody(second.quoteId) })).json as unknown as OrderBody;
    settleOrder(db, refused.id, "refused");
    expect(db.read((tables) => tables.nfts.nft_012.editions[0].available)).toBe(30);
    expect(db.read((tables) => tables.carts.usr_ana.items)).toHaveLength(2);
    expect(((await call("GET", `/orders/${refused.id}`, { token: second.token })).json as unknown as OrderBody).refusal).not.toBeNull();
  });

  it("pedido de outro usuário responde 403 e inexistente 404, e o recibo não muda com o preço", async () => {
    const { token, quoteId } = await prepareCheckout();
    const order = (await call("POST", "/orders", { token, key: "k1", body: orderBody(quoteId) })).json as unknown as OrderBody;
    db.commit((draft) => {
      draft.nfts.nft_004.editions[0].price = "9" as never;
    });
    expect(((await call("GET", `/orders/${order.id}`, { token })).json as unknown as OrderBody).receipt.total).toBe("0.8724");

    const bruno = await login("bruno@kurio.test");
    expect((await call("GET", `/orders/${order.id}`, { token: bruno })).status).toBe(403);
    expect((await call("GET", "/orders/ord_999", { token: bruno })).status).toBe(404);
  });
});
