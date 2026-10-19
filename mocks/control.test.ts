import { beforeEach, describe, expect, it } from "vitest";
import { createControl, type KurioControl } from "./control";
import { createMockDb, type MockDb, type MockDbEvent } from "./db/mockDb";
import { createSeed } from "./db/seed";
import { createNetworkConditions } from "./network/conditions";
import { buildScenario, type PresetName } from "./scenarios/presets";

const NOW = Date.parse("2026-10-19T12:00:00.000Z");

let db: MockDb;
let control: KurioControl;
let scenarioNames: PresetName[];
let events: MockDbEvent[];

beforeEach(() => {
  db = createMockDb({ seed: createSeed, now: () => NOW });
  scenarioNames = ["default"];
  events = [];
  db.subscribe((emitted) => events.push(...emitted));
  control = createControl({
    db,
    conditions: createNetworkConditions({
      getScenario: () => buildScenario(scenarioNames),
      wait: () => Promise.resolve(),
    }),
    getScenarioNames: () => scenarioNames,
    setScenarioNames: (names) => {
      scenarioNames = names;
    },
    build: "abc1234",
  });
});

describe("catalog", () => {
  it("setPrice muda o preço, recalcula o priceFrom e emite nft.updated com a versão nova", () => {
    control.catalog.setPrice("nft_001", "ed_001_1", "1.99");

    const nft = db.read((tables) => tables.nfts.nft_001);
    expect(nft.editions[0].price).toBe("1.99");
    expect(nft.priceFrom).toBe("1.99");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "nft.updated",
      resource: { kind: "nft", id: "nft_001" },
      version: 1,
      data: { nftId: "nft_001", priceFrom: "1.99" },
    });
  });

  it("setAvailable zera o estoque e marca a edição como esgotada", () => {
    control.catalog.setAvailable("nft_001", "ed_001_1", 0);

    expect(db.read((tables) => tables.nfts.nft_001.editions[0].status)).toBe("sold_out");
    expect(events[0]).toMatchObject({ data: { editions: [{ available: 0, status: "sold_out" }, {}] } });
  });

  it("recusa preço inválido, disponibilidade negativa e edição inexistente", () => {
    expect(() => control.catalog.setPrice("nft_001", "ed_001_1", "1,99")).toThrow();
    expect(() => control.catalog.setAvailable("nft_001", "ed_001_1", -1)).toThrow();
    expect(() => control.catalog.setPrice("nft_999", "ed_999_1", "1")).toThrow("Edição inexistente");
    expect(events).toHaveLength(0);
  });
});

describe("scenario", () => {
  it("troca o cenário por nomes válidos e recusa os inválidos", () => {
    control.scenario.set("slow+flaky");
    expect(control.scenario.get()).toBe("slow+flaky");
    expect(() => control.scenario.set("inexistente")).toThrow("Cenário inválido");
    expect(control.scenario.get()).toBe("slow+flaky");
  });
});

describe("sessions e inspect", () => {
  it("expira só as sessões do usuário pedido", () => {
    db.commit((draft) => {
      const future = new Date(NOW + 60_000).toISOString();
      draft.sessions.a = { token: "a", userId: "usr_ana", expiresAt: future };
      draft.sessions.b = { token: "b", userId: "usr_bruno", expiresAt: future };
    });

    control.sessions.expire("usr_ana");

    const sessions = db.read((tables) => tables.sessions);
    expect(Date.parse(sessions.a.expiresAt)).toBeLessThan(NOW);
    expect(Date.parse(sessions.b.expiresAt)).toBeGreaterThan(NOW);
  });

  it("devolve o carrinho no formato do contrato, sem campos do servidor", () => {
    const cart = control.inspect.cart("usr_ana");

    expect(cart?.items).toHaveLength(2);
    expect(cart).not.toHaveProperty("owner");
    expect(control.inspect.cart("usr_ninguem")).toBeNull();
    expect(control.inspect.orders()).toEqual([]);
  });

  it("reset volta ao seed e expõe o SHA do build", () => {
    control.catalog.setPrice("nft_001", "ed_001_1", "1.99");
    control.reset();

    expect(db.read((tables) => tables.nfts.nft_001.priceFrom)).toBe("2.38");
    expect(control.build).toBe("abc1234");
  });
});
