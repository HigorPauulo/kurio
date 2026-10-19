import { NFT_FIXTURES } from "../fixtures/catalog";
import {
  CART_FIXTURES,
  FAVORITE_FIXTURES,
  USER_FIXTURES,
  WALLET_FIXTURES,
} from "../fixtures/users";
import { emptyTables, type Tables } from "./tables";

function byKey<Row>(rows: readonly Row[], key: (row: Row) => string): Record<string, Row> {
  return Object.fromEntries(rows.map((row) => [key(row), row]));
}

export function createSeed(): Tables {
  return structuredClone({
    ...emptyTables(),
    users: byKey(USER_FIXTURES, (user) => user.id),
    nfts: byKey(NFT_FIXTURES, (nft) => nft.id),
    wallets: byKey(WALLET_FIXTURES, (wallet) => wallet.id),
    carts: byKey(CART_FIXTURES, (cart) => cart.owner),
    favorites: { ...FAVORITE_FIXTURES },
  });
}
