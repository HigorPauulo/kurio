import type { AxiosError } from "axios";
import { errorBodySchema, type ErrorCode } from "@/contracts/error";

export type ApiErrorInfo =
  | {
      kind: "http";
      status: number;
      code: ErrorCode;
      retryable: boolean;
      requestId: string;
      fieldErrors?: Record<string, string[]>;
      details?: unknown;
    }
  | { kind: "network"; code: "NETWORK_ERROR"; retryable: true }
  | { kind: "timeout"; code: "TIMEOUT"; retryable: true }
  | {
      kind: "contract";
      code: "CONTRACT_VIOLATION";
      path: string;
      retryable: false;
    };

export class ApiError extends Error {
  readonly info: ApiErrorInfo;

  constructor(info: ApiErrorInfo, message: string) {
    super(message);
    this.name = "ApiError";
    this.info = info;
  }
}

const TIMEOUT_CODES = new Set(["ECONNABORTED", "ETIMEDOUT"]);

export function normalizeError(error: AxiosError): ApiError {
  if (error.code && TIMEOUT_CODES.has(error.code)) {
    return new ApiError(
      { kind: "timeout", code: "TIMEOUT", retryable: true },
      "A requisição excedeu o tempo limite.",
    );
  }

  if (!error.response) {
    return new ApiError(
      { kind: "network", code: "NETWORK_ERROR", retryable: true },
      "Sem conexão com o servidor.",
    );
  }

  const { status, data, headers } = error.response;
  const body = errorBodySchema.safeParse(data);
  if (body.success) {
    const { message, ...info } = body.data.error;
    return new ApiError({ kind: "http", status, ...info }, message);
  }

  return new ApiError(
    {
      kind: "http",
      status,
      code: status >= 500 ? "INTERNAL" : "BAD_REQUEST",
      retryable: status >= 500,
      requestId: String(headers["x-request-id"] ?? ""),
    },
    error.message,
  );
}
