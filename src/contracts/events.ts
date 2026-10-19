import { z } from "zod";
import {
  dateTimeSchema,
  editionIdSchema,
  ethAmountSchema,
  nftIdSchema,
  orderIdSchema,
  userIdSchema,
} from "./common";
import { editionStatusSchema } from "./nft";
import { orderSchema, orderStatusSchema } from "./order";

function envelopeSchema<const Type extends string, Data extends z.ZodType>(
  type: Type,
  kind: "nft" | "order",
  data: Data,
): z.ZodObject<{
  id: z.ZodString;
  type: z.ZodLiteral<Type>;
  resource: z.ZodObject<{ kind: z.ZodLiteral<"nft" | "order">; id: z.ZodString }>;
  version: z.ZodNumber;
  audience: z.ZodNullable<z.ZodObject<{ userId: z.ZodString }>>;
  occurredAt: z.ZodISODateTime;
  data: Data;
}> {
  return z.object({
    id: z.string(),
    type: z.literal(type),
    resource: z.object({ kind: z.literal(kind), id: z.string() }),
    version: z.number().int().min(0),
    audience: z.object({ userId: userIdSchema }).nullable(),
    occurredAt: dateTimeSchema,
    data,
  });
}

export const nftUpdatedSchema = envelopeSchema(
  "nft.updated",
  "nft",
  z.object({
    nftId: nftIdSchema,
    priceFrom: ethAmountSchema,
    editions: z.array(
      z.object({
        editionId: editionIdSchema,
        price: ethAmountSchema,
        available: z.number().int().min(0),
        status: editionStatusSchema,
      }),
    ),
  }),
);

export const orderUpdatedSchema = envelopeSchema(
  "order.updated",
  "order",
  z.object({
    orderId: orderIdSchema,
    status: orderStatusSchema,
    transaction: orderSchema.shape.transaction,
    refusal: orderSchema.shape.refusal,
  }),
);

export const realtimeEventSchema = z.discriminatedUnion("type", [
  nftUpdatedSchema,
  orderUpdatedSchema,
]);

export const nftSubscriptionSchema = z.object({
  nftIds: z.array(nftIdSchema),
});

export const orderSubscriptionSchema = z.object({
  orderId: orderIdSchema,
});

export const subscriptionAckSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true) }),
  z.object({ ok: z.literal(false), code: z.enum(["FORBIDDEN", "NOT_FOUND"]) }),
]);

export type NftUpdatedEvent = z.infer<typeof nftUpdatedSchema>;
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedSchema>;
export type RealtimeEvent = z.infer<typeof realtimeEventSchema>;
export type SubscriptionAck = z.infer<typeof subscriptionAckSchema>;
