import type { CartItem, Cart, Quote, QuoteIssue } from "@/contracts/cart";
import type { Chain, EthAmount } from "@/contracts/common";
import { purchaseLimit, type Edition, type Nft } from "@/contracts/nft";
import { addEth, compareEth, minEth, multiplyEth, percentOfEth, subtractEth } from "@/lib/eth";
import { COUPON_FIXTURES, NETWORK_FEE_FIXTURES, type CouponFixture } from "../fixtures/commerce";
import type { CartRecord, Tables } from "./tables";

export const QUOTE_TTL_MS = 5 * 60_000;

const ZERO = "0" as EthAmount;

export function editionLimit(edition: Edition): number {
  return purchaseLimit(edition);
}

export function findEdition(tables: Readonly<Tables>, nftId: string, editionId: string): { nft: Nft; edition: Edition } | null {
  const nft = tables.nfts[nftId];
  const edition = nft?.editions.find((candidate) => candidate.id === editionId);
  return nft && edition ? { nft, edition } : null;
}

function itemStatus(item: Pick<CartItem, "quantity" | "unitPrice">, edition: Edition | undefined): CartItem["status"] {
  if (!edition || editionLimit(edition) === 0) return "sold_out";
  if (item.quantity > editionLimit(edition)) return "insufficient";
  if (compareEth(item.unitPrice, edition.price) !== 0) return "price_changed";
  return "ok";
}

export function toCartView(tables: Readonly<Tables>, record: CartRecord): Cart {
  return {
    id: record.id,
    coupon: record.coupon,
    version: record.version,
    updatedAt: record.updatedAt,
    items: record.items.map((item) => {
      const edition = findEdition(tables, item.nftId, item.editionId)?.edition;
      return {
        ...item,
        available: edition?.available ?? 0,
        maxPerOrder: edition?.maxPerOrder ?? item.maxPerOrder,
        status: itemStatus(item, edition),
      };
    }),
  };
}

export function findCoupon(code: string): CouponFixture | undefined {
  return COUPON_FIXTURES.find((coupon) => coupon.code === code);
}

export function isCouponExpired(coupon: CouponFixture, nowMs: number): boolean {
  return coupon.expiresAt !== null && Date.parse(coupon.expiresAt) <= nowMs;
}

export function couponDiscount(coupon: CouponFixture, subtotal: EthAmount): EthAmount {
  return coupon.kind === "percent" ? percentOfEth(subtotal, coupon.basisPoints) : minEth(coupon.amount, subtotal);
}

export function currentSubtotal(tables: Readonly<Tables>, record: CartRecord): EthAmount {
  return record.items.reduce<EthAmount>((total, item) => {
    const price = findEdition(tables, item.nftId, item.editionId)?.edition.price ?? item.unitPrice;
    return addEth(total, multiplyEth(price, item.quantity));
  }, ZERO);
}

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export type QuoteDraft = Omit<Quote, "id" | "createdAt" | "expiresAt">;

export function buildQuote(tables: Readonly<Tables>, record: CartRecord, network: Chain, nowMs: number): QuoteDraft {
  const issues: QuoteIssue[] = [];
  const versions: string[] = [];

  const lines = record.items.map((item) => {
    const found = findEdition(tables, item.nftId, item.editionId);
    const unitPrice = found?.edition.price ?? item.unitPrice;
    versions.push(`${item.nftId}@${found?.nft.version ?? -1}`);

    const status = itemStatus(item, found?.edition);
    if (status === "sold_out") {
      issues.push({ kind: "SOLD_OUT", itemId: item.id });
    } else if (status === "insufficient" && found) {
      issues.push({ kind: "INSUFFICIENT", itemId: item.id, requested: item.quantity, available: editionLimit(found.edition) });
    }
    if (compareEth(item.unitPrice, unitPrice) !== 0) {
      issues.push({ kind: "PRICE_CHANGED", itemId: item.id, from: item.unitPrice, to: unitPrice });
    }

    return {
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      unitPrice,
      lineTotal: multiplyEth(unitPrice, item.quantity),
    };
  });

  const subtotal = lines.reduce<EthAmount>((total, line) => addEth(total, line.lineTotal), ZERO);
  const coupon = record.coupon ? findCoupon(record.coupon.code) : undefined;
  let discount = ZERO;
  if (coupon && isCouponExpired(coupon, nowMs)) {
    issues.push({ kind: "COUPON_EXPIRED", code: coupon.code });
  } else if (coupon?.minimum && compareEth(subtotal, coupon.minimum) < 0) {
    issues.push({ kind: "COUPON_MINIMUM_NOT_MET", code: coupon.code, minimum: coupon.minimum });
  } else if (coupon) {
    discount = couponDiscount(coupon, subtotal);
  }

  const fee = NETWORK_FEE_FIXTURES[network];
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const networkFee = addEth(fee.base, multiplyEth(fee.perItem, itemCount));
  const isBlocked = issues.some((issue) => issue.kind === "SOLD_OUT" || issue.kind === "INSUFFICIENT");

  return {
    cartId: record.id,
    cartVersion: record.version,
    network,
    lines,
    coupon: coupon ? { code: coupon.code, description: coupon.description } : null,
    subtotal,
    discount,
    networkFee,
    total: addEth(subtractEth(subtotal, discount), networkFee),
    issues,
    purchasable: lines.length > 0 && !isBlocked,
    basisHash: hashText([...versions, record.coupon?.code ?? "", network].join("|")),
  };
}
