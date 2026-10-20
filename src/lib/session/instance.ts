import { useSyncExternalStore } from "react";
import { createGuestCart } from "./guestCart";
import { createSessionStore, type SessionState } from "./sessionStore";

function openLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const sessionStore = createSessionStore({ storage: openLocalStorage() });

export const guestCart = createGuestCart(openLocalStorage());

export function getCartOwner(state: SessionState = sessionStore.getState()): string | null {
  if (state.status !== "anonymous") return state.session.user.id;
  const guestCartId = guestCart.peek();
  return guestCartId ? `guest:${guestCartId}` : null;
}

export function ensureCartOwner(): string {
  const state = sessionStore.getState();
  return state.status === "anonymous" ? `guest:${guestCart.ensure()}` : state.session.user.id;
}

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState);
}

export function useCartOwner(): string | null {
  const session = useSession();
  useSyncExternalStore(guestCart.subscribe, guestCart.peek);
  return getCartOwner(session);
}
