import { z } from "zod";
import {
  cartIdSchema,
  cartItemIdSchema,
  chainSchema,
  dateTimeSchema,
  editionIdSchema,
  ethAmountSchema,
  imageSchema,
  nftIdSchema,
  quoteIdSchema,
} from "./common";

const positiveQuantitySchema = z.number().int().min(1, "A quantidade mínima é 1.");

export const cartItemStatusSchema = z.enum(["ok", "price_changed", "insufficient", "sold_out"]);

export const cartItemSchema = z.object({
  id: cartItemIdSchema,
  nftId: nftIdSchema,
  editionId: editionIdSchema,
  quantity: positiveQuantitySchema,
  nftName: z.string(),
  editionLabel: z.string(),
  cover: imageSchema,
  unitPrice: ethAmountSchema,
  available: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1),
  status: cartItemStatusSchema,
});

export const cartSchema = z.object({
  id: cartIdSchema,
  items: z.array(cartItemSchema),
  coupon: z.object({ code: z.string() }).nullable(),
  version: z.number().int().min(0),
  updatedAt: dateTimeSchema,
});

export const addCartItemBodySchema = z.object({
  nftId: nftIdSchema,
  editionId: editionIdSchema,
  quantity: positiveQuantitySchema,
});

export const updateCartItemBodySchema = z.object({
  quantity: positiveQuantitySchema,
});

export const applyCouponBodySchema = z.object({
  code: z.string().trim().toUpperCase().min(1, "Informe o cupom."),
});

export const mergeCartBodySchema = z.object({
  guestCartId: z.uuid(),
});

export const mergeCartResponseSchema = z.object({
  cart: cartSchema,
  adjustments: z.array(
    z.object({
      editionId: editionIdSchema,
      requested: z.number().int().min(1),
      kept: z.number().int().min(0),
    }),
  ),
});

export const quoteLineSchema = z.object({
  itemId: cartItemIdSchema,
  nftId: nftIdSchema,
  editionId: editionIdSchema,
  quantity: positiveQuantitySchema,
  unitPrice: ethAmountSchema,
  lineTotal: ethAmountSchema,
});

export const quoteIssueSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("PRICE_CHANGED"),
    itemId: cartItemIdSchema,
    from: ethAmountSchema,
    to: ethAmountSchema,
  }),
  z.object({
    kind: z.literal("INSUFFICIENT"),
    itemId: cartItemIdSchema,
    requested: z.number().int().min(1),
    available: z.number().int().min(0),
  }),
  z.object({ kind: z.literal("SOLD_OUT"), itemId: cartItemIdSchema }),
  z.object({ kind: z.literal("COUPON_EXPIRED"), code: z.string() }),
  z.object({
    kind: z.literal("COUPON_MINIMUM_NOT_MET"),
    code: z.string(),
    minimum: ethAmountSchema,
  }),
]);

export const quoteSchema = z.object({
  id: quoteIdSchema,
  cartId: cartIdSchema,
  cartVersion: z.number().int().min(0),
  network: chainSchema,
  lines: z.array(quoteLineSchema),
  coupon: z.object({ code: z.string(), description: z.string() }).nullable(),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  issues: z.array(quoteIssueSchema),
  purchasable: z.boolean(),
  basisHash: z.string(),
  createdAt: dateTimeSchema,
  expiresAt: dateTimeSchema,
});

export const quotePurposeSchema = z.enum(["cart", "checkout"]);

export const createQuoteBodySchema = z.object({
  network: chainSchema,
  purpose: quotePurposeSchema.default("cart"),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type Cart = z.infer<typeof cartSchema>;
export type MergeCartResponse = z.infer<typeof mergeCartResponseSchema>;
export type QuoteLine = z.infer<typeof quoteLineSchema>;
export type QuoteIssue = z.infer<typeof quoteIssueSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type QuotePurpose = z.infer<typeof quotePurposeSchema>;
