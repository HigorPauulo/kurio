import {
  queryOptions,
  type DataTag,
  type UseQueryOptions,
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import type { ChangePasswordBody, UpdateMeBody, User } from "@/contracts/user";
import type { CreateWalletBody, Wallet } from "@/contracts/wallet";
import { keys } from "@/lib/query/keys";
import {
  changePassword,
  createWallet,
  getMe,
  getWallets,
  removeAvatar,
  updateMe,
  updateWallet,
  uploadAvatar,
} from "./api";

const FIVE_MINUTES = 5 * 60_000;

type PrivateKeys = ReturnType<typeof keys.priv>;

type PrivateQueryOptions<TData, TKey extends readonly unknown[]> = UseQueryOptions<TData, Error, TData, TKey> & {
  queryKey: DataTag<TKey, TData, Error>;
};

export function meQuery(userId: string): PrivateQueryOptions<User, PrivateKeys["me"]> {
  return queryOptions({
    queryKey: keys.priv(userId).me,
    queryFn: ({ signal }) => getMe(signal),
    staleTime: FIVE_MINUTES,
  });
}

export function walletsQuery(userId: string): PrivateQueryOptions<Wallet[], PrivateKeys["wallets"]> {
  return queryOptions({
    queryKey: keys.priv(userId).wallets,
    queryFn: ({ signal }) => getWallets(signal),
    staleTime: FIVE_MINUTES,
  });
}

export function useUpdateMeMutation(userId: string): UseMutationResult<User, Error, UpdateMeBody> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateMe,
    onSuccess: (user) => queryClient.setQueryData(keys.priv(userId).me, user),
  });
}

export function useAvatarMutation(userId: string): UseMutationResult<string | null, Error, File | null> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File | null) => {
      if (!file) {
        await removeAvatar();
        return null;
      }
      return uploadAvatar(file);
    },
    onSuccess: (avatarUrl) =>
      queryClient.setQueryData<User>(keys.priv(userId).me, (user) => user && { ...user, avatarUrl }),
  });
}

export function useChangePasswordMutation(): UseMutationResult<void, Error, ChangePasswordBody> {
  return useMutation({ mutationFn: changePassword });
}

export type SaveWalletInput = { walletId?: string; body: CreateWalletBody };

export function useSaveWalletMutation(userId: string): UseMutationResult<Wallet, Error, SaveWalletInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveWalletInput) =>
      input.walletId ? updateWallet(input.walletId, input.body) : createWallet(input.body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.priv(userId).wallets }),
  });
}
