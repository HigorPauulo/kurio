import { describe, expect, it } from "vitest";
import { createNetworkConditions } from "../network/conditions";
import { BASE_SCENARIO, buildScenario, type PresetName } from "./presets";
import { parseScenario, resolveInitialScenario, stripScenarioParams } from "./selection";

describe("seleção de cenário", () => {
  it("lê presets combinados e recusa nome desconhecido", () => {
    expect(parseScenario("slow+payment-refused")).toEqual(["slow", "payment-refused"]);
    expect(parseScenario("slow+inexistente")).toBeNull();
    expect(parseScenario("")).toBeNull();
  });

  it("usa a URL, depois o salvo, depois a variável de ambiente, depois default", () => {
    const resolve = (search: string, stored: string | null, envDefault?: string): PresetName[] =>
      resolveInitialScenario({ search, stored, envDefault }).names;

    expect(resolve("?scenario=fast", "slow", "flaky")).toEqual(["fast"]);
    expect(resolve("", "slow", "flaky")).toEqual(["slow"]);
    expect(resolve("", null, "flaky")).toEqual(["flaky"]);
    expect(resolve("?scenario=errado", null, undefined)).toEqual(["default"]);
  });

  it("detecta reset=1 e remove scenario e reset da URL, mantendo o resto", () => {
    expect(resolveInitialScenario({ search: "?scenario=fast&reset=1", stored: null, envDefault: undefined }).reset).toBe(true);
    expect(stripScenarioParams("?scenario=fast&reset=1&page=2")).toBe("?page=2");
    expect(stripScenarioParams("?scenario=fast")).toBe("");
  });
});

describe("composição de presets", () => {
  it("aplica da esquerda para a direita, e o posterior vence", () => {
    const scenario = buildScenario(["fast", "payment-refused", "session-short"]);

    expect(scenario.settleMs).toBe(300);
    expect(scenario.settleOutcome).toBe("refused");
    expect(scenario.sessionTtlMs).toBe(60_000);
    expect(buildScenario(["default"])).toEqual(BASE_SCENARIO);
  });
});

describe("condições de rede", () => {
  function setup(names: PresetName[]) {
    const waits: number[] = [];
    const conditions = createNetworkConditions({
      getScenario: () => buildScenario(names),
      wait: (ms) => {
        waits.push(ms);
        return Promise.resolve();
      },
    });
    return { conditions, waits };
  }

  const request = (path: string, method = "GET"): Request =>
    new Request(`http://localhost${path}`, { method });

  it("sorteia a latência dentro da faixa, sempre na mesma sequência", async () => {
    const first = setup(["default"]);
    const second = setup(["default"]);
    for (let call = 0; call < 3; call += 1) {
      await first.conditions.apply(request("/api/nfts"));
      await second.conditions.apply(request("/api/nfts"));
    }

    expect(first.waits).toEqual(second.waits);
    expect(first.waits.every((ms) => ms >= 120 && ms <= 450)).toBe(true);
  });

  it("aplica slow só em leituras", async () => {
    const { conditions, waits } = setup(["slow"]);
    await conditions.apply(request("/api/nfts"));
    await conditions.apply(request("/api/cart/items", "POST"));

    expect(waits[0]).toBe(2500);
    expect(waits[1]).toBeLessThan(2500);
  });

  it("falha as 2 primeiras chamadas de cada rota no flaky, com o corpo de erro da API", async () => {
    const { conditions } = setup(["flaky"]);
    const statuses: (number | undefined)[] = [];
    for (let call = 0; call < 3; call += 1) {
      statuses.push((await conditions.apply(request("/api/nfts")))?.status);
    }
    const otherRoute = await conditions.apply(request("/api/cart"));

    expect(statuses).toEqual([503, 503, undefined]);
    expect(otherRoute?.status).toBe(503);
    await expect(otherRoute?.json()).resolves.toMatchObject({
      error: { code: "UNAVAILABLE", retryable: true },
    });
  });

  it("faz a requisição antiga do catálogo chegar por último no out-of-order", async () => {
    const { conditions, waits } = setup(["out-of-order"]);
    for (let call = 0; call < 3; call += 1) await conditions.apply(request("/api/nfts"));

    expect(waits).toEqual([3000, 2000, 1000]);
  });

  it("responde erro de rede no offline", async () => {
    const { conditions } = setup(["offline"]);
    const response = await conditions.apply(request("/api/nfts"));

    expect(response?.type).toBe("error");
  });

  it("registra as requisições para inspeção e zera tudo no reset", async () => {
    const { conditions } = setup(["fast"]);
    await conditions.apply(request("/api/nfts?category=music&page=2"));

    expect(conditions.lastRequest("^/api/nfts")).toEqual({
      url: "/api/nfts?category=music&page=2",
      query: { category: "music", page: "2" },
    });
    conditions.reset();
    expect(conditions.lastRequest("^/api/nfts")).toBeNull();
  });
});
