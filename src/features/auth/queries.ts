import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import type { LoginBody, RegisterBody, Session } from "@/contracts/user";
import { sessionStore } from "@/lib/session/instance";
import { completeLogin, switchIdentity } from "@/lib/session/session";
import { login, logout, register } from "./api";

export function useLoginMutation(): UseMutationResult<Session, Error, LoginBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: LoginBody) => {
      const session = await login(body);
      await completeLogin(sessionStore, queryClient, session);
      return session;
    },
  });
}

export function useRegisterMutation(): UseMutationResult<Session, Error, RegisterBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: RegisterBody) => {
      const session = await register(body);
      await completeLogin(sessionStore, queryClient, session);
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
