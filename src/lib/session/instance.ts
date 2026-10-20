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

export function getCartOwner(state: SessionState = sessionStore.getState()): string {
  return state.status === "anonymous" ? `guest:${guestCart.ensure()}` : state.session.user.id;
}

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState);
}

export function useCartOwner(): string {
  return getCartOwner(useSession());
}
