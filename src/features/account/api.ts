import {
  avatarResponseSchema,
  userSchema,
  type ChangePasswordBody,
  type UpdateMeBody,
  type User,
} from "@/contracts/user";
import {
  walletSchema,
  walletsResponseSchema,
  type CreateWalletBody,
  type UpdateWalletBody,
  type Wallet,
} from "@/contracts/wallet";
import type { Chain } from "@/contracts/common";
import { parseResponse } from "@/lib/http/apiError";
import { http } from "@/lib/http/client";

export async function getMe(signal?: AbortSignal): Promise<User> {
  const { data } = await http.get<unknown>("/me", { signal });
  return parseResponse(userSchema, data);
}

export async function updateMe(body: UpdateMeBody): Promise<User> {
  const { data } = await http.patch<unknown>("/me", body);
  return parseResponse(userSchema, data);
}

export async function uploadAvatar(file: File): Promise<string | null> {
  const form = new FormData();
  form.set("file", file);
  const { data } = await http.post<unknown>("/me/avatar", form);
  return parseResponse(avatarResponseSchema, data).avatarUrl;
}

export async function removeAvatar(): Promise<void> {
  await http.delete("/me/avatar");
}

export async function changePassword(body: ChangePasswordBody): Promise<void> {
  await http.post("/me/password", body);
}

export async function getWallets(signal?: AbortSignal): Promise<Wallet[]> {
  const { data } = await http.get<unknown>("/me/wallets", { signal });
  return parseResponse(walletsResponseSchema, data);
}

export async function createWallet(body: CreateWalletBody): Promise<Wallet> {
  const { data } = await http.post<unknown>("/me/wallets", body);
  return parseResponse(walletSchema, data);
}

export async function updateWallet(walletId: string, body: UpdateWalletBody): Promise<Wallet> {
  const { data } = await http.patch<unknown>(`/me/wallets/${walletId}`, body);
  return parseResponse(walletSchema, data);
}

export async function connectWallet(walletId: string, network: Chain): Promise<Wallet> {
  const { data } = await http.post<unknown>(`/me/wallets/${walletId}/connection`, { network });
  return parseResponse(walletSchema, data);
}

export async function disconnectWallet(walletId: string): Promise<Wallet> {
  const { data } = await http.delete<unknown>(`/me/wallets/${walletId}/connection`);
  return parseResponse(walletSchema, data);
}
