import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { LoginBody, RegisterBody, Session } from "@/contracts/user";
import { announce } from "@/lib/a11y/announcer";
import { guestCart, sessionStore } from "@/lib/session/instance";
import { completeLogin, switchIdentity, type CartAdjustment } from "@/lib/session/session";
import { login, logout, register } from "./api";

function announceAdjustments(adjustments: CartAdjustment[]): void {
  if (adjustments.length === 0) return;
  const count = adjustments.length;
  announce(
    `Unimos o carrinho de visitante ao seu. ${count} ${count === 1 ? "item foi ajustado" : "itens foram ajustados"} ao limite disponível.`,
  );
}

export function useLoginMutation(): UseMutationResult<Session, Error, LoginBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: LoginBody) => {
      const session = await login(body);
      announceAdjustments(await completeLogin(sessionStore, queryClient, session, guestCart));
      return session;
    },
  });
}

export function useRegisterMutation(): UseMutationResult<Session, Error, RegisterBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: RegisterBody) => {
      const session = await register(body);
      announceAdjustments(await completeLogin(sessionStore, queryClient, session, guestCart));
      return session;
    },
  });
}

export function useLogoutMutation(): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (sessionStore.getState().status === "authenticated") {
        await logout().catch(() => undefined);
      }
      await switchIdentity(sessionStore, queryClient, null);
    },
  });
}
