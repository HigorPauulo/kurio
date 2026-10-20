export const keys = {
  catalog: {
    all: ["catalog"] as const,
    list: <Query extends object>(query: Query) => ["catalog", "list", query] as const,
    featured: ["catalog", "featured"] as const,
  },
  nft: (nftId: string) => ["nft", nftId] as const,
  privRoot: () => ["u"] as const,
  priv: (owner: string) => ({
    all: ["u", owner] as const,
    me: ["u", owner, "me"] as const,
    wallets: ["u", owner, "wallets"] as const,
    favorites: ["u", owner, "favorites"] as const,
    cart: ["u", owner, "cart"] as const,
    quotes: ["u", owner, "quote"] as const,
    quote: (network: string, cartVersion: number) => ["u", owner, "quote", network, cartVersion] as const,
    checkoutQuote: (network: string, cartVersion: number) => ["u", owner, "quote", "checkout", network, cartVersion] as const,
    order: (orderId: string) => ["u", owner, "order", orderId] as const,
  }),
};
