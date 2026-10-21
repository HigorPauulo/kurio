import { z } from "zod";
import {
  chainSchema,
  dateTimeSchema,
  ethAmountSchema,
  imageSchema,
  orderIdSchema,
  quoteIdSchema,
  tokenIdSchema,
  walletIdSchema,
} from "./common";
import { quoteLineSchema } from "./cart";
import { walletProviderSchema } from "./wallet";

export const orderStatusSchema = z.enum(["pending", "confirmed", "refused"]);

export const buyerSchema = z.object({
  name: z.string(),
  username: z.string(),
  email: z.string(),
  ensName: z.string(),
  profileName: z.string(),
  referralCode: z.string(),
  note: z.string().nullable(),
});

export const receiptSchema = z.object({
  lines: z.array(
    quoteLineSchema.extend({
      nftName: z.string(),
      tokenId: tokenIdSchema,
      editionLabel: z.string(),
      cover: imageSchema,
    }),
  ),
  subtotal: ethAmountSchema,
  discount: ethAmountSchema,
  networkFee: ethAmountSchema,
  total: ethAmountSchema,
  coupon: z.object({ code: z.string() }).nullable(),
  network: chainSchema,
  wallet: z.object({
    id: walletIdSchema,
    label: z.string(),
    address: z.string(),
    provider: walletProviderSchema,
  }),
  buyer: buyerSchema,
});

export const orderSchema = z.object({
  id: orderIdSchema,
  status: orderStatusSchema,
  version: z.number().int().min(0),
  quoteId: quoteIdSchema,
  receipt: receiptSchema,
  transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
  refusal: z.object({ reason: z.string() }).nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const createOrderBodySchema = z.object({
  quoteId: quoteIdSchema,
  walletId: walletIdSchema,
  network: chainSchema,
  note: z.string().trim().max(500, "Use no máximo 500 caracteres.").nullable(),
});

export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type Buyer = z.infer<typeof buyerSchema>;
export type Order = z.infer<typeof orderSchema>;
export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export function isTerminalOrderStatus(status: string): boolean {
  return status === "confirmed" || status === "refused";
}
