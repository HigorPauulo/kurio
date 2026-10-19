import { HttpResponse } from "msw";
import type { NetworkRule, Scenario } from "../scenarios/presets";

const RANDOM_SEED = 20261019;
const REQUEST_LOG_LIMIT = 50;

export type LoggedRequest = { url: string; query: Record<string, string> };

export type NetworkConditions = {
  apply: (request: Request) => Promise<Response | undefined>;
  lastRequest: (pattern: string) => LoggedRequest | null;
  reset: () => void;
};

export type NetworkConditionsOptions = {
  getScenario: () => Scenario;
  wait?: (ms: number) => Promise<void>;
};

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function matches(rule: NetworkRule, method: string, pathname: string): boolean {
  return (!rule.methods || rule.methods.includes(method)) && (!rule.path || rule.path.test(pathname));
}

function resolveRule(rules: readonly NetworkRule[], method: string, pathname: string): NetworkRule {
  return rules
    .filter((rule) => matches(rule, method, pathname))
    .reduce<NetworkRule>((resolved, rule) => ({ ...resolved, ...rule }), {});
}

function defaultWait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createNetworkConditions({
  getScenario,
  wait = defaultWait,
}: NetworkConditionsOptions): NetworkConditions {
  let random = mulberry32(RANDOM_SEED);
  let callsByRoute = new Map<string, number>();
  let log: LoggedRequest[] = [];

  function countCall(routeKey: string): number {
    const calls = (callsByRoute.get(routeKey) ?? 0) + 1;
    callsByRoute.set(routeKey, calls);
    return calls;
  }

  return {
    async apply(request) {
      const url = new URL(request.url);
      const routeKey = `${request.method} ${url.pathname}`;
      const call = countCall(routeKey);
      log = [...log.slice(-(REQUEST_LOG_LIMIT - 1)), { url: url.pathname + url.search, query: Object.fromEntries(url.searchParams) }];

      const rule = resolveRule(getScenario().rules, request.method, url.pathname);

      if (rule.offline) return HttpResponse.error();

      const failure = rule.failure;
      if (failure && (failure.firstCalls === undefined || call <= failure.firstCalls)) {
        return HttpResponse.json(
          {
            error: {
              code: failure.code,
              message: "Falha simulada pelo cenário.",
              retryable: failure.status >= 500,
              requestId: request.headers.get("X-Request-Id") ?? "",
            },
          },
          { status: failure.status },
        );
      }

      if (rule.outOfOrder) {
        const { baseMs, stepMs, cycle } = rule.outOfOrder;
        await wait(baseMs - stepMs * ((call - 1) % cycle));
      } else if (rule.latencyMs) {
        const [min, max] = rule.latencyMs;
        await wait(Math.round(min + (max - min) * random()));
      }

      return undefined;
    },

    lastRequest(pattern) {
      const expression = new RegExp(pattern);
      return log.findLast((entry) => expression.test(entry.url)) ?? null;
    },

    reset() {
      random = mulberry32(RANDOM_SEED);
      callsByRoute = new Map();
      log = [];
    },
  };
}
