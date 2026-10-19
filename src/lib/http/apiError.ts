import type { AxiosError } from "axios";
import { z } from "zod";
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

const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  400: "BAD_REQUEST",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  422: "VALIDATION_FAILED",
  503: "UNAVAILABLE",
};

const RETRYABLE_STATUSES = new Set([408, 429]);

const looseErrorBodySchema = z.object({
  error: z.object({
    message: z.string().optional(),
    requestId: z.string().optional(),
  }),
});

function codeForStatus(status: number): ErrorCode {
  return CODE_BY_STATUS[status] ?? (status >= 500 ? "INTERNAL" : "BAD_REQUEST");
}

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

  const loose = looseErrorBodySchema.safeParse(data);
  const serverError = loose.success ? loose.data.error : undefined;

  return new ApiError(
    {
      kind: "http",
      status,
      code: codeForStatus(status),
      retryable: status >= 500 || RETRYABLE_STATUSES.has(status),
      requestId:
        serverError?.requestId ?? String(headers["x-request-id"] ?? ""),
    },
    serverError?.message ?? error.message,
  );
}
