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
  }),
};
