import { z } from "zod";
import { chainSchema } from "@/contracts/common";
import { createOrderBodySchema } from "@/contracts/order";

const attemptSchema = z.object({
  key: z.uuid(),
  body: createOrderBodySchema,
});

const draftSchema = z.object({
  network: chainSchema.optional(),
  isSecondaryWallet: z.boolean(),
  note: z.string(),
});

export type CheckoutAttempt = z.infer<typeof attemptSchema>;
export type CheckoutDraft = z.infer<typeof draftSchema>;

export const EMPTY_DRAFT: CheckoutDraft = { isSecondaryWallet: false, note: "" };

function attemptKey(userId: string): string {
  return `kurio:checkout:attempt:${userId}`;
}

function draftKey(userId: string): string {
  return `kurio:checkout:draft:${userId}`;
}

function readJson<Schema extends z.ZodType>(storage: () => Storage, key: string, schema: Schema): z.output<Schema> | null {
  try {
    const raw = storage().getItem(key);
    if (!raw) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeJson(storage: () => Storage, key: string, value: unknown): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
}

export function readAttempt(userId: string): CheckoutAttempt | null {
  return readJson(() => localStorage, attemptKey(userId), attemptSchema);
}

export function saveAttempt(userId: string, attempt: CheckoutAttempt | null): void {
  writeJson(() => localStorage, attemptKey(userId), attempt);
}

export function readDraft(userId: string): CheckoutDraft {
  return readJson(() => sessionStorage, draftKey(userId), draftSchema) ?? EMPTY_DRAFT;
}

export function saveDraft(userId: string, draft: CheckoutDraft): void {
  writeJson(() => sessionStorage, draftKey(userId), draft);
}
