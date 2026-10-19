export const keys = {
  privRoot: () => ["u"] as const,
  priv: (owner: string) => ({
    all: ["u", owner] as const,
    me: ["u", owner, "me"] as const,
    wallets: ["u", owner, "wallets"] as const,
  }),
};
