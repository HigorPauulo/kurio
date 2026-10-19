import type { QueryClient } from "@tanstack/react-query";
import type { Session } from "@/contracts/user";
import { keys } from "@/lib/query/keys";
import type { SessionStore } from "./sessionStore";

export async function switchIdentity(
  store: SessionStore,
  queryClient: QueryClient,
  next: Session | null,
): Promise<void> {
  await queryClient.cancelQueries();
  queryClient.removeQueries({ queryKey: keys.privRoot() });

  if (!next) {
    store.clear();
    return;
  }
  store.setSession(next);
  queryClient.setQueryData(keys.priv(next.user.id).me, next.user);
}

export async function completeLogin(
  store: SessionStore,
  queryClient: QueryClient,
  session: Session,
): Promise<void> {
  const state = store.getState();
  if (state.status === "expired" && state.session.user.id === session.user.id) {
    store.setSession(session);
    queryClient.setQueryData(keys.priv(session.user.id).me, session.user);
    return;
  }
  await switchIdentity(store, queryClient, session);
}
