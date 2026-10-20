import { orderSchema, type CreateOrderBody, type Order } from "@/contracts/order";
import { parseResponse } from "@/lib/http/apiError";
import { http } from "@/lib/http/client";

export async function createOrder(body: CreateOrderBody, idempotencyKey: string): Promise<Order> {
  const { data } = await http.post<unknown>("/orders", body, { headers: { "Idempotency-Key": idempotencyKey } });
  return parseResponse(orderSchema, data);
}

export async function getOrder(orderId: string, signal?: AbortSignal): Promise<Order> {
  const { data } = await http.get<unknown>(`/orders/${encodeURIComponent(orderId)}`, { signal });
  return parseResponse(orderSchema, data);
}
