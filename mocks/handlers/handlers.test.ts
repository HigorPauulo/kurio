import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createMockDb } from "../db/mockDb";
import { createSeed } from "../db/seed";
import { createNetworkConditions } from "../network/conditions";
import { buildScenario, type PresetName } from "../scenarios/presets";
import { authHandlers } from "./auth";
import { meHandlers } from "./me";
import type { HandlerDeps } from "./shared";
import { walletHandlers } from "./wallets";

const START = Date.parse("2026-10-19T12:00:00.000Z");
const PASSWORD = "Kurio@2026";

let nowMs = START;
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
};

const server = setupServer(...authHandlers(deps), ...meHandlers(deps), ...walletHandlers(deps));

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
  nowMs = START;
  scenarioNames = ["fast"];
  db.reset();
});
afterEach(() => server.resetHandlers());

type CallOptions = { token?: string; body?: unknown; form?: FormData };

type ResponseBody = {
  [key: string]: unknown;
  error: { code: string; fieldErrors: Record<string, string[]> };
  user: { id: string };
  token: string;
  expiresAt: string;
  avatarUrl: string;
  connection: unknown;
};

async function call(method: string, path: string, { token, body, form }: CallOptions = {}) {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
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
