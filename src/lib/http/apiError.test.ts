import {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type RawAxiosResponseHeaders,
} from "axios";
import { describe, expect, it } from "vitest";
import { ApiError, normalizeError } from "./apiError";

function httpError(
  status: number,
  data: unknown,
  headers: RawAxiosResponseHeaders = {},
): AxiosError {
  const response: AxiosResponse = {
    status,
    statusText: "",
    data,
    headers,
    config: { headers: new AxiosHeaders() },
  };
  return new AxiosError(
    "Request failed",
    "ERR_BAD_RESPONSE",
    undefined,
    undefined,
    response,
  );
}

describe("normalizeError", () => {
  it("converte timeout do Axios em erro de timeout recuperável", () => {
    const error = normalizeError(new AxiosError("timeout", "ECONNABORTED"));

    expect(error).toBeInstanceOf(ApiError);
    expect(error.info).toEqual({
      kind: "timeout",
      code: "TIMEOUT",
      retryable: true,
    });
  });

  it("converte falha sem resposta em erro de rede recuperável", () => {
    const error = normalizeError(new AxiosError("Network Error", "ERR_NETWORK"));

    expect(error.info).toEqual({
      kind: "network",
      code: "NETWORK_ERROR",
      retryable: true,
    });
  });

  it("lê o corpo de erro da API e usa a mensagem do servidor", () => {
    const error = normalizeError(
      httpError(409, {
        error: {
          code: "AVAILABILITY_CONFLICT",
          message: "Edição sem estoque.",
          retryable: false,
          requestId: "req-1",
          details: { editionId: "ed_1", available: 0, maxPerOrder: 2 },
        },
      }),
    );

    expect(error.message).toBe("Edição sem estoque.");
    expect(error.info).toEqual({
      kind: "http",
      status: 409,
      code: "AVAILABILITY_CONFLICT",
      retryable: false,
      requestId: "req-1",
      details: { editionId: "ed_1", available: 0, maxPerOrder: 2 },
    });
  });

  it("preserva os erros por campo da validação", () => {
    const error = normalizeError(
      httpError(422, {
        error: {
          code: "VALIDATION_FAILED",
          message: "Dados inválidos.",
          retryable: false,
          requestId: "req-2",
          fieldErrors: { username: ["Já em uso."] },
        },
      }),
    );

    expect(error.info).toMatchObject({
      code: "VALIDATION_FAILED",
      fieldErrors: { username: ["Já em uso."] },
    });
  });

  it("trata 5xx fora do formato da API como erro interno recuperável", () => {
    const error = normalizeError(
      httpError(503, "<html>Service Unavailable</html>", {
        "x-request-id": "req-3",
      }),
    );

    expect(error.info).toEqual({
      kind: "http",
      status: 503,
      code: "INTERNAL",
      retryable: true,
      requestId: "req-3",
    });
  });

  it("trata 4xx fora do formato da API como requisição inválida não recuperável", () => {
    const error = normalizeError(httpError(404, "Not Found"));

    expect(error.info).toMatchObject({
      kind: "http",
      status: 404,
      code: "BAD_REQUEST",
      retryable: false,
    });
  });
});
