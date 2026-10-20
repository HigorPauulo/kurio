import { cartSchema, quoteSchema, type Cart, type Quote } from "@/contracts/cart";
import type { Chain } from "@/contracts/common";
import { parseResponse } from "@/lib/http/apiError";
import { http } from "@/lib/http/client";

export type AddCartItemInput = { nftId: string; editionId: string; quantity: number };

export async function getCart(signal?: AbortSignal): Promise<Cart> {
  const { data } = await http.get<unknown>("/cart", { signal });
  return parseResponse(cartSchema, data);
}

export async function addCartItem(body: AddCartItemInput): Promise<Cart> {
  const { data } = await http.post<unknown>("/cart/items", body);
  return parseResponse(cartSchema, data);
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  const { data } = await http.patch<unknown>(`/cart/items/${encodeURIComponent(itemId)}`, { quantity });
  return parseResponse(cartSchema, data);
}

export async function removeCartItem(itemId: string): Promise<Cart> {
  const { data } = await http.delete<unknown>(`/cart/items/${encodeURIComponent(itemId)}`);
  return parseResponse(cartSchema, data);
}

export async function applyCoupon(code: string): Promise<Cart> {
  const { data } = await http.put<unknown>("/cart/coupon", { code });
  return parseResponse(cartSchema, data);
}

export async function removeCoupon(): Promise<Cart> {
  const { data } = await http.delete<unknown>("/cart/coupon");
  return parseResponse(cartSchema, data);
}

export async function createQuote(network: Chain, signal?: AbortSignal): Promise<Quote> {
  const { data } = await http.post<unknown>("/quotes", { network }, { signal });
  return parseResponse(quoteSchema, data);
}
