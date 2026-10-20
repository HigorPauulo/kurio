import type { WalletProvider } from "@/contracts/wallet";

export const PROVIDER_LABELS: Record<WalletProvider, string> = {
  metamask: "MetaMask",
  walletconnect: "WalletConnect",
  coinbase: "Coinbase Wallet",
};
