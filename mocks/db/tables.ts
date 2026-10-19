import type { NftId, OrderId, UserId } from "@/contracts/common";
import type { Cart, Quote } from "@/contracts/cart";
import type { Nft } from "@/contracts/nft";
import type { Order } from "@/contracts/order";
import type { User } from "@/contracts/user";
import type { Wallet } from "@/contracts/wallet";

export type UserRecord = User & { passwordHash: string; salt: string };

export type SessionRecord = { token: string; userId: UserId; expiresAt: string };

export type CartRecord = Cart & { owner: string };

export type QuoteRecord = Quote & { owner: string; usedByOrderId: OrderId | null };

export type OrderRecord = Order & { userId: UserId; settleAt: string | null };

export type IdempotencyRecord = { bodyHash: string; orderId: OrderId };

export type WalletRecord = Wallet & { userId: UserId };

export type Tables = {
  meta: { sequence: number };
  users: Record<string, UserRecord>;
  sessions: Record<string, SessionRecord>;
  nfts: Record<string, Nft>;
  carts: Record<string, CartRecord>;
  quotes: Record<string, QuoteRecord>;
  orders: Record<string, OrderRecord>;
  idempotency: Record<string, IdempotencyRecord>;
  favorites: Record<string, NftId[]>;
  wallets: Record<string, WalletRecord>;
};

export function emptyTables(): Tables {
  return {
    meta: { sequence: 0 },
    users: {},
    sessions: {},
    nfts: {},
    carts: {},
    quotes: {},
    orders: {},
    idempotency: {},
    favorites: {},
    wallets: {},
  };
}
