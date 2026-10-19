import type { EthAmount } from "@/contracts/common";

const DECIMALS = 18;
const WEI_PER_ETH = 10n ** BigInt(DECIMALS);
const BPS_PER_UNIT = 10_000n;
export const ETH_AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,18}))?$/;
const THOUSANDS = /\B(?=(\d{3})+(?!\d))/g;

export function toWei(amount: EthAmount): bigint {
  const match = ETH_AMOUNT_PATTERN.exec(amount);
  if (!match) throw new RangeError(`Valor em ETH inválido: ${amount}`);
  const [, integer, fraction = ""] = match;
  return BigInt(integer) * WEI_PER_ETH + BigInt(fraction.padEnd(DECIMALS, "0"));
}

export function fromWei(wei: bigint): EthAmount {
  if (wei < 0n) throw new RangeError("Valor em ETH não pode ser negativo.");
  const integer = wei / WEI_PER_ETH;
  const fraction = (wei % WEI_PER_ETH).toString().padStart(DECIMALS, "0").replace(/0+$/, "");
  return (fraction ? `${integer}.${fraction}` : `${integer}`) as EthAmount;
}

export function addEth(...amounts: EthAmount[]): EthAmount {
  return fromWei(amounts.reduce((total, amount) => total + toWei(amount), 0n));
}

export function subtractEth(minuend: EthAmount, subtrahend: EthAmount): EthAmount {
  return fromWei(toWei(minuend) - toWei(subtrahend));
}

export function multiplyEth(amount: EthAmount, quantity: number): EthAmount {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new RangeError(`Quantidade inválida: ${quantity}`);
  }
  return fromWei(toWei(amount) * BigInt(quantity));
}

export function percentOfEth(amount: EthAmount, basisPoints: number): EthAmount {
  return fromWei((toWei(amount) * BigInt(basisPoints)) / BPS_PER_UNIT);
}

export function compareEth(left: EthAmount, right: EthAmount): -1 | 0 | 1 {
  const difference = toWei(left) - toWei(right);
  if (difference === 0n) return 0;
  return difference < 0n ? -1 : 1;
}

export function minEth(left: EthAmount, right: EthAmount): EthAmount {
  return compareEth(left, right) <= 0 ? left : right;
}

export function formatEth(amount: EthAmount): string {
  const [integer, fraction] = fromWei(toWei(amount)).split(".");
  const grouped = integer.replace(THOUSANDS, ".");
  return fraction ? `${grouped},${fraction}` : grouped;
}

export function formatEthInput(amount: EthAmount): string {
  return fromWei(toWei(amount)).replace(".", ",");
}

export function parseEthInput(input: string): EthAmount | null {
  const trimmed = input.trim();
  const separators = trimmed.match(/[.,]/g) ?? [];
  if (separators.length > 1) return null;

  const normalized = trimmed.replace(",", ".");
  const withLeadingZero = normalized.startsWith(".") ? `0${normalized}` : normalized;
  const canonical = withLeadingZero.replace(/^0+(?=\d)/, "");
  if (!ETH_AMOUNT_PATTERN.test(canonical)) return null;

  return fromWei(toWei(canonical as EthAmount));
}
