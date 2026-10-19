import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ClientModule from "./client";

let client: typeof ClientModule;

let rejectionCode = "SESSION_EXPIRED";

function rejectAsSessionExpired(request: InternalAxiosRequestConfig): Promise<never> {
  return Promise.reject(
    new AxiosError("expired", "ERR_BAD_REQUEST", request, undefined, {
      status: 401,
      statusText: "",
      headers: {},
      config: request,
      data: {
        error: {
          code: rejectionCode,
          message: "Sessão expirada.",
          retryable: false,
          requestId: "req-1",
        },
      },
    }),
  );
}

beforeEach(async () => {
  vi.resetModules();
  rejectionCode = "SESSION_EXPIRED";
  client = await import("./client");
  client.http.defaults.adapter = rejectAsSessionExpired;
});

describe("expiração de sessão", () => {
  it("dispara uma vez quando várias requisições com o mesmo token expiram", async () => {
    let token: string | null = "token-a";
    const onSessionExpired = vi.fn(() => {
      token = null;
    });
    client.configureHttp({
      getToken: () => token,
      getGuestCartId: () => null,
      onSessionExpired,
    });

    await Promise.allSettled([client.http.get("/me"), client.http.get("/cart")]);

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("não derruba a sessão nova quando uma resposta antiga expira depois do novo login", async () => {
    let token: string | null = "token-a";
    const onSessionExpired = vi.fn(() => {
      token = "token-b";
    });
    client.configureHttp({
      getToken: () => token,
      getGuestCartId: () => null,
      onSessionExpired,
    });

    await Promise.allSettled([client.http.get("/me"), client.http.get("/cart")]);

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("dispara de novo quando um token novo expira", async () => {
    let token: string | null = "token-a";
    const onSessionExpired = vi.fn();
    client.configureHttp({
      getToken: () => token,
      getGuestCartId: () => null,
      onSessionExpired,
    });

    await client.http.get("/me").catch(() => undefined);
    token = "token-b";
    await client.http.get("/me").catch(() => undefined);

    expect(onSessionExpired).toHaveBeenCalledTimes(2);
  });

  it("trata como expirada a sessão que o servidor não reconhece mais", async () => {
    rejectionCode = "UNAUTHENTICATED";
    const onSessionExpired = vi.fn();
    client.configureHttp({
      getToken: () => "token-a",
      getGuestCartId: () => null,
      onSessionExpired,
    });

    await client.http.get("/me").catch(() => undefined);

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("não dispara para requisição enviada sem token", async () => {
    const onSessionExpired = vi.fn();
    client.configureHttp({
      getToken: () => null,
      getGuestCartId: () => null,
      onSessionExpired,
    });

    const error: unknown = await client.http.get("/me").catch((e: unknown) => e);

    expect(error).toMatchObject({ info: { code: "SESSION_EXPIRED" } });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe("erros fora do Axios", () => {
  it("chegam intactos, sem virar erro de rede", async () => {
    const failure = new Error("falha ao ler o token");
    client.configureHttp({
      getToken: () => {
        throw failure;
      },
      getGuestCartId: () => null,
      onSessionExpired: () => undefined,
    });

    const error: unknown = await client.http.get("/me").catch((e: unknown) => e);

    expect(error).toBe(failure);
  });
});
