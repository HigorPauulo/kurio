import { useSyncExternalStore } from "react";
import { createSessionStore, type SessionState } from "./sessionStore";

function openLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const sessionStore = createSessionStore({ storage: openLocalStorage() });

export function useSession(): SessionState {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState);
}
