import { z } from "zod";

export const errorCodeSchema = z.enum([
  "BAD_REQUEST",
  "UNAUTHENTICATED",
  "SESSION_EXPIRED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "NOT_FOUND",
  "EMAIL_TAKEN",
  "USERNAME_TAKEN",
  "WALLET_ADDRESS_TAKEN",
  "AVAILABILITY_CONFLICT",
  "QUOTE_STALE",
  "QUOTE_EXPIRED",
  "QUOTE_ALREADY_USED",
  "IDEMPOTENCY_CONFLICT",
  "WALLET_NOT_CONNECTED",
  "VALIDATION_FAILED",
  "COUPON_INVALID",
  "COUPON_EXPIRED",
  "COUPON_MINIMUM_NOT_MET",
  "WRONG_PASSWORD",
  "WALLET_REJECTED",
  "INTERNAL",
  "UNAVAILABLE",
]);

export const errorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    retryable: z.boolean(),
    requestId: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
    details: z.unknown().optional(),
  }),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
