import type { QueryClient } from "@tanstack/react-query";
import type { MergeCartResponse } from "@/contracts/cart";
import type { Session } from "@/contracts/user";
import { keys } from "@/lib/query/keys";
import { realtime } from "@/lib/realtime/instance";
import type { GuestCart } from "./guestCart";
import type { SessionStore } from "./sessionStore";

export type CartAdjustment = MergeCartResponse["adjustments"][number];

async function mergeGuestCart(
  queryClient: QueryClient,
  userId: string,
  guestCart: GuestCart | null,
): Promise<CartAdjustment[]> {
  const guestCartId = guestCart?.peek();
  if (!guestCart || !guestCartId) return [];
  try {
    const { cart, adjustments } = await guestCart.merge(guestCartId);
    guestCart.clear();
    await queryClient.cancelQueries({ queryKey: keys.priv(userId).cart });
    queryClient.setQueryData(keys.priv(userId).cart, cart);
    return adjustments;
  } catch {
    return [];
  }
}

export async function switchIdentity(
  store: SessionStore,
  queryClient: QueryClient,
  next: Session | null,
  guestCart: GuestCart | null = null,
): Promise<CartAdjustment[]> {
  await queryClient.cancelQueries({ queryKey: keys.privRoot() });
  realtime.reset(next?.user.id ?? null);
  queryClient.removeQueries({ queryKey: keys.privRoot() });

  if (!next) {
    store.clear();
    return [];
  }
  store.setSession(next);
  queryClient.setQueryData(keys.priv(next.user.id).me, next.user);
  return mergeGuestCart(queryClient, next.user.id, guestCart);
}

export async function completeLogin(
  store: SessionStore,
  queryClient: QueryClient,
  session: Session,
  guestCart: GuestCart | null = null,
): Promise<CartAdjustment[]> {
  const state = store.getState();
  if (state.status === "expired" && state.session.user.id === session.user.id) {
    store.setSession(session);
    queryClient.setQueryData(keys.priv(session.user.id).me, session.user);
    return [];
  }
  return switchIdentity(store, queryClient, session, guestCart);
}
