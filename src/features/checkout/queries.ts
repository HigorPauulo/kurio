import { queryOptions, type DataTag, type QueryClient, type UseQueryOptions } from "@tanstack/react-query";
import type { Quote } from "@/contracts/cart";
import type { Chain } from "@/contracts/common";
import type { Order } from "@/contracts/order";
import { ApiError } from "@/lib/http/apiError";
import { keys } from "@/lib/query/keys";
import { eventStore } from "@/lib/realtime/eventStore";
import { isRealtimeConnected } from "@/lib/realtime/instance";
import { createQuote } from "../cart/api";
import { createOrder, getOrder } from "./api";
import type { CheckoutAttempt } from "./storage";

const ONE_MINUTE = 60_000;
const FIVE_MINUTES = 5 * ONE_MINUTE;
const POLL_MS = 5_000;
const MIN_QUOTE_REFRESH_MS = 1_000;
const MAX_SEND_ATTEMPTS = 3;
const ORDER_CODES = new Set(["QUOTE_ALREADY_USED", "IDEMPOTENCY_CONFLICT"]);
const REVIEW_CODES = new Set(["QUOTE_STALE", "QUOTE_EXPIRED", "AVAILABILITY_CONFLICT", "WALLET_NOT_CONNECTED"]);
const HIDDEN_ORDER_CODES = new Set(["NOT_FOUND", "FORBIDDEN"]);

type TaggedQueryOptions<TData, TKey extends readonly unknown[]> = UseQueryOptions<TData, Error, TData, TKey> & {
  queryKey: DataTag<TKey, TData, Error>;
};

type PrivateKeys = ReturnType<typeof keys.priv>;

function msUntilExpiry(quote: Quote | undefined): number {
  return quote ? Math.max(Date.parse(quote.expiresAt) - Date.now(), 0) : 0;
}

export function checkoutQuoteQuery(
  userId: string,
  network: Chain,
  cartVersion: number,
): TaggedQueryOptions<Quote, ReturnType<PrivateKeys["checkoutQuote"]>> {
  return queryOptions({
    queryKey: keys.priv(userId).checkoutQuote(network, cartVersion),
    queryFn: ({ signal }) => createQuote(network, signal, "checkout"),
    staleTime: (query) => msUntilExpiry(query.state.data),
    refetchInterval: (query) => (query.state.data ? Math.max(msUntilExpiry(query.state.data), MIN_QUOTE_REFRESH_MS) : false),
    refetchOnWindowFocus: false,
    gcTime: ONE_MINUTE,
  });
}

export function orderQuery(userId: string, orderId: string): TaggedQueryOptions<Order, ReturnType<PrivateKeys["order"]>> {
  return queryOptions({
    queryKey: keys.priv(userId).order(orderId),
    queryFn: async ({ signal }) => {
      const order = await getOrder(orderId, signal);
      eventStore.seed("order", order.id, order.version, order.status);
      return order;
    },
    staleTime: 0,
    gcTime: FIVE_MINUTES,
    refetchInterval: (query) => (query.state.data?.status === "pending" && !isRealtimeConnected() ? POLL_MS : false),
  });
}

export async function ensureOrder(queryClient: QueryClient, userId: string, orderId: string): Promise<Order | null> {
  try {
    return await queryClient.ensureQueryData(orderQuery(userId, orderId));
  } catch (error) {
    if (error instanceof ApiError && HIDDEN_ORDER_CODES.has(error.info.code)) return null;
    throw error;
  }
}

export type SubmitOutcome =
  | { kind: "order"; orderId: string }
  | { kind: "review"; message: string }
  | { kind: "details"; error: unknown }
  | { kind: "retry"; message: string };

function detailsOrderId(error: ApiError): string | null {
  if (error.info.kind !== "http") return null;
  const details = error.info.details as { orderId?: unknown } | undefined;
  return typeof details?.orderId === "string" ? details.orderId : null;
}

export async function submitAttempt(attempt: CheckoutAttempt): Promise<SubmitOutcome> {
  for (let sent = 1; ; sent += 1) {
    try {
      const order = await createOrder(attempt.body, attempt.key);
      return { kind: "order", orderId: order.id };
    } catch (error) {
      if (!(error instanceof ApiError)) return { kind: "details", error };
      const orderId = ORDER_CODES.has(error.info.code) ? detailsOrderId(error) : null;
      if (orderId) return { kind: "order", orderId };
      if (REVIEW_CODES.has(error.info.code)) return { kind: "review", message: error.message };
      if (!error.info.retryable) return { kind: "details", error };
      if (sent >= MAX_SEND_ATTEMPTS) {
        return { kind: "retry", message: "Não tivemos resposta do servidor. O pedido pode já existir: tentar de novo não cria outro." };
      }
    }
  }
}
