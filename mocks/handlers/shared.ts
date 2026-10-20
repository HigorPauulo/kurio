import { HttpResponse } from "msw";
import type { z } from "zod";
import type { ErrorCode } from "@/contracts/error";
import { userSchema, type Session, type User } from "@/contracts/user";
import type { MockDb } from "../db/mockDb";
import type { OrderScheduler } from "../db/orders";
import type { Tables, UserRecord } from "../db/tables";
import type { NetworkConditions } from "../network/conditions";
import type { Scenario } from "../scenarios/presets";

export const API = "*/api";

export type HandlerDeps = {
  db: MockDb;
  conditions: NetworkConditions;
  getScenario: () => Scenario;
  now: () => number;
  wait: (ms: number) => Promise<void>;
  orders: OrderScheduler;
};

type ErrorExtras = { fieldErrors?: Record<string, string[]>; details?: unknown };

export function apiError(
  request: Request,
  status: number,
  code: ErrorCode,
  message: string,
  extras: ErrorExtras = {},
): Response {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        retryable: status >= 500,
        requestId: request.headers.get("X-Request-Id") ?? "",
        ...extras,
      },
    },
    { status },
  );
}

export function fieldError(
  request: Request,
  status: number,
  code: ErrorCode,
  field: string,
  message: string,
): Response {
  return apiError(request, status, code, message, { fieldErrors: { [field]: [message] } });
}

export type Parsed<Data> = { data: Data; response?: undefined } | { data?: undefined; response: Response };

export async function parseBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<Parsed<z.output<Schema>>> {
  const body: unknown = await request.json().catch(() => undefined);
  const result = schema.safeParse(body);
  if (result.success) return { data: result.data };

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join(".") || "body";
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return {
    response: apiError(request, 422, "VALIDATION_FAILED", "Dados inválidos.", { fieldErrors }),
  };
}

export function readToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization");
  return authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : null;
}

export type Authenticated = { userId: string; token: string; response?: undefined } | { response: Response };

export function authenticate(deps: HandlerDeps, request: Request): Authenticated {
  const token = readToken(request);
  const session = token ? deps.db.read((tables) => tables.sessions[token]) : undefined;
  if (!token || !session) {
    return { response: apiError(request, 401, "UNAUTHENTICATED", "Faça login para continuar.") };
  }
  if (Date.parse(session.expiresAt) <= deps.now()) {
    return { response: apiError(request, 401, "SESSION_EXPIRED", "Sua sessão expirou.") };
  }
  return { userId: session.userId, token };
}

export function toUser(record: UserRecord): User {
  return userSchema.parse(record);
}

export function createSession(
  draft: Tables,
  userId: string,
  nextId: (prefix: string) => string,
  nowMs: number,
  ttlMs: number,
): Session {
  const token = nextId("tok");
  const expiresAt = new Date(nowMs + ttlMs).toISOString();
  draft.sessions[token] = { token, userId, expiresAt };
  return { token, expiresAt, user: toUser(draft.users[userId]) };
}

export type ResolverInfo = {
  request: Request;
  params: Record<string, string | readonly string[] | undefined>;
};

export function withConditions(
  deps: HandlerDeps,
  resolver: (info: ResolverInfo) => Response | Promise<Response>,
): (info: ResolverInfo) => Promise<Response> {
  return async (info) => (await deps.conditions.apply(info.request)) ?? resolver(info);
}
