import { z } from "zod";
import { mergeCartResponseSchema, type MergeCartResponse } from "@/contracts/cart";
import { parseResponse } from "@/lib/http/apiError";
import { http } from "@/lib/http/client";

export const GUEST_CART_STORAGE_KEY = "kurio:guestCartId";

export type GuestCart = {
  subscribe: (listener: () => void) => () => void;
  peek: () => string | null;
  ensure: () => string;
  clear: () => void;
  merge: (guestCartId: string) => Promise<MergeCartResponse>;
};

type GuestCartStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const guestCartIdSchema = z.uuid();

export function createGuestCart(storage: GuestCartStorage | null): GuestCart {
  let memoryId: string | null = null;
  const listeners = new Set<() => void>();

  function emit(): void {
    for (const listener of listeners) listener();
  }

  function read(): string | null {
    try {
      const parsed = guestCartIdSchema.safeParse(storage?.getItem(GUEST_CART_STORAGE_KEY));
      return parsed.success ? parsed.data : memoryId;
    } catch {
      return memoryId;
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    peek: read,
    ensure() {
      const existing = read();
      if (existing) return existing;
      const created = crypto.randomUUID();
      memoryId = created;
      try {
        storage?.setItem(GUEST_CART_STORAGE_KEY, created);
      } catch {
        memoryId = created;
      }
      emit();
      return created;
    },
    clear() {
      memoryId = null;
      try {
        storage?.removeItem(GUEST_CART_STORAGE_KEY);
      } catch {
        memoryId = null;
      }
      emit();
    },
    async merge(guestCartId) {
      const { data } = await http.post<unknown>("/cart/merge", { guestCartId });
      return parseResponse(mergeCartResponseSchema, data);
    },
  };
}
