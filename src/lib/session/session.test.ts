import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@/contracts/user";
import { keys } from "@/lib/query/keys";
import { completeLogin, switchIdentity } from "./session";
import { createSessionStore, SESSION_STORAGE_KEY } from "./sessionStore";

const NOW = Date.parse("2026-10-19T12:00:00.000Z");

function makeSession(userId: string, token: string, ttlMs = 60_000): Session {
  return {
    token,
    expiresAt: new Date(NOW + ttlMs).toISOString(),
    user: {
      id: userId,
      email: `${userId}@kurio.test`,
      username: userId,
      name: userId,
      ensName: null,
      avatarUrl: null,
      createdAt: "2026-09-15T12:00:00.000Z",
    },
  };
}

function memoryStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("sessionStore", () => {
  it("persiste a sessão, expõe o token e expira sozinho no expiresAt", () => {
    const storage = memoryStorage();
    const store = createSessionStore({ storage });

    store.setSession(makeSession("usr_ana", "tok_a"));
    expect(store.getToken()).toBe("tok_a");
    expect(storage.getItem(SESSION_STORAGE_KEY)).toContain("tok_a");

    vi.advanceTimersByTime(60_000);
    expect(store.getState().status).toBe("expired");
  });

  it("restaura do armazenamento: válida como autenticada, vencida como expirada, corrompida como anônima", () => {
    const valid = memoryStorage();
    valid.setItem(SESSION_STORAGE_KEY, JSON.stringify(makeSession("usr_ana", "tok_a")));
    const stale = memoryStorage();
    stale.setItem(SESSION_STORAGE_KEY, JSON.stringify(makeSession("usr_ana", "tok_a", -1)));
    const broken = memoryStorage();
    broken.setItem(SESSION_STORAGE_KEY, "{corrompido");

    expect(createSessionStore({ storage: valid }).getState().status).toBe("authenticated");
    expect(createSessionStore({ storage: stale }).getState().status).toBe("expired");
    expect(createSessionStore({ storage: broken }).getState().status).toBe("anonymous");
  });

  it("clear apaga a sessão e cancela o timer de expiração", () => {
    const storage = memoryStorage();
    const store = createSessionStore({ storage });
    store.setSession(makeSession("usr_ana", "tok_a"));

    store.clear();
    vi.advanceTimersByTime(60_000);

    expect(store.getState().status).toBe("anonymous");
    expect(storage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it("troca de estado mesmo quando o armazenamento recusa a gravação", () => {
    const refusing: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("cheio", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("bloqueado", "SecurityError");
      },
    };
    const store = createSessionStore({ storage: refusing });

    store.setSession(makeSession("usr_ana", "tok_a"));
    expect(store.getToken()).toBe("tok_a");

    store.clear();
    expect(store.getState().status).toBe("anonymous");
  });
});

describe("troca de identidade", () => {
  it("switchIdentity apaga todo o cache privado do usuário anterior e grava o novo", async () => {
    const queryClient = new QueryClient();
    const store = createSessionStore({ storage: memoryStorage() });
    await switchIdentity(store, queryClient, makeSession("usr_ana", "tok_a"));
    queryClient.setQueryData(keys.priv("usr_ana").wallets, [{ id: "wal_ana_1" }]);

    await switchIdentity(store, queryClient, makeSession("usr_bruno", "tok_b"));

    expect(queryClient.getQueryData(keys.priv("usr_ana").wallets)).toBeUndefined();
    expect(queryClient.getQueryData(keys.priv("usr_ana").me)).toBeUndefined();
    expect(queryClient.getQueryData(keys.priv("usr_bruno").me)).toMatchObject({ id: "usr_bruno" });
    expect(queryClient.getQueryCache().findAll({ queryKey: keys.privRoot() }).map((q) => q.queryKey[1])).toEqual([
      "usr_bruno",
    ]);
  });

  it("não cancela a busca de dado público em andamento", async () => {
    const queryClient = new QueryClient();
    const store = createSessionStore({ storage: memoryStorage() });
    let resolveCatalog: (value: string[]) => void = () => undefined;
    const catalog = queryClient.fetchQuery({
      queryKey: ["catalog", "featured"],
      queryFn: () => new Promise<string[]>((resolve) => (resolveCatalog = resolve)),
    });

    await switchIdentity(store, queryClient, makeSession("usr_ana", "tok_a"));
    resolveCatalog(["nft_001"]);

    await expect(catalog).resolves.toEqual(["nft_001"]);
  });

  it("completeLogin do mesmo usuário depois da expiração mantém o cache; de outro usuário, limpa", async () => {
    const queryClient = new QueryClient();
    const store = createSessionStore({ storage: memoryStorage() });
    await switchIdentity(store, queryClient, makeSession("usr_ana", "tok_a"));
    queryClient.setQueryData(keys.priv("usr_ana").wallets, [{ id: "wal_ana_1" }]);

    store.expire();
    await completeLogin(store, queryClient, makeSession("usr_ana", "tok_a2"));
    expect(queryClient.getQueryData(keys.priv("usr_ana").wallets)).toEqual([{ id: "wal_ana_1" }]);

    store.expire();
    await completeLogin(store, queryClient, makeSession("usr_bruno", "tok_b"));
    expect(queryClient.getQueryData(keys.priv("usr_ana").wallets)).toBeUndefined();
  });
});
