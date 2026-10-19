import type { Chain, EthAmount } from "@/contracts/common";

export type CouponFixture =
  | { code: string; description: string; kind: "percent"; basisPoints: number; minimum: null; expiresAt: string | null }
  | { code: string; description: string; kind: "fixed"; amount: EthAmount; minimum: EthAmount | null; expiresAt: string | null };

export const COUPON_FIXTURES: readonly CouponFixture[] = [
  {
    code: "KURIO10",
    description: "10% de desconto",
    kind: "percent",
    basisPoints: 1000,
    minimum: null,
    expiresAt: null,
  },
  {
    code: "FIXO005",
    description: "0,005 ETH de desconto em compras a partir de 0,05 ETH",
    kind: "fixed",
    amount: "0.005" as EthAmount,
    minimum: "0.05" as EthAmount,
    expiresAt: null,
  },
  {
    code: "EXPIRADO",
    description: "15% de desconto, encerrado",
    kind: "percent",
    basisPoints: 1500,
    minimum: null,
    expiresAt: "2026-01-01T00:00:00.000Z",
  },
];

export const NETWORK_FEE_FIXTURES: Readonly<Record<Chain, { base: EthAmount; perItem: EthAmount }>> = {
  ethereum: { base: "0.0015" as EthAmount, perItem: "0.0003" as EthAmount },
  polygon: { base: "0.0001" as EthAmount, perItem: "0.00002" as EthAmount },
  base: { base: "0.0002" as EthAmount, perItem: "0.00004" as EthAmount },
};
