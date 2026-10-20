import type { Chain } from "@/contracts/common";
import type { Order } from "@/contracts/order";
import { nftUpdatedData, refreshNft } from "./nftUpdates";
import type { MockDb } from "./mockDb";
import { hashText } from "./commerce";
import type { OrderRecord, Tables } from "./tables";

const EXPLORERS: Record<Chain, string> = {
  ethereum: "https://etherscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  base: "https://basescan.org/tx/",
};

export const REFUSAL_REASON = "A rede recusou o pagamento simulado. Nenhum valor foi cobrado.";

export type SettleOutcome = "confirmed" | "refused";

function transactionHash(orderId: string): string {
  return `0x${Array.from({ length: 8 }, (_, index) => hashText(`${orderId}:${index}`)).join("")}`;
}

export function adjustStock(draft: Tables, order: Order, direction: -1 | 1, emit: (nftId: string) => void): void {
  for (const line of order.receipt.lines) {
    const nft = draft.nfts[line.nftId];
    const edition = nft?.editions.find((candidate) => candidate.id === line.editionId);
    if (!nft || !edition) continue;
    edition.available += direction * line.quantity;
    refreshNft(nft);
    emit(nft.id);
  }
}

export function settleOrder(db: MockDb, orderId: string, outcome: SettleOutcome): boolean {
  const current = db.read((tables) => tables.orders[orderId]);
  if (!current || current.status !== "pending") return false;

  db.commit((draft, { emit, now }) => {
    const order: OrderRecord = draft.orders[orderId];
    const timestamp = now().toISOString();
    const emitNft = (nftId: string) =>
      emit({ type: "nft.updated", resourceId: nftId, audience: null, data: nftUpdatedData(draft.nfts[nftId]) });

    order.status = outcome;
    order.settleAt = null;
    order.updatedAt = timestamp;
    if (outcome === "confirmed") {
      const hash = transactionHash(order.id);
      order.transaction = { hash, explorerUrl: `${EXPLORERS[order.receipt.network]}${hash}` };
      const cart = draft.carts[order.userId];
      if (cart) {
        for (const line of order.receipt.lines) {
          const item = cart.items.find((candidate) => candidate.editionId === line.editionId);
          if (item) item.quantity -= line.quantity;
        }
        cart.items = cart.items.filter((item) => item.quantity > 0);
        cart.updatedAt = timestamp;
      }
    } else {
      order.refusal = { reason: REFUSAL_REASON };
      adjustStock(draft, order, 1, emitNft);
    }

    emit({
      type: "order.updated",
      resourceId: order.id,
      audience: { userId: order.userId },
      data: { orderId: order.id, status: order.status, transaction: order.transaction, refusal: order.refusal },
    });
  });
  return true;
}

export type OrderScheduler = {
  schedule: (orderId: string, settleAtMs: number) => void;
  resume: () => void;
};

export function createOrderScheduler(options: {
  db: MockDb;
  now: () => number;
  getOutcome: () => SettleOutcome;
}): OrderScheduler {
  const { db, now, getOutcome } = options;
  const timers = new Map<string, ReturnType<typeof setTimeout>>();

  function schedule(orderId: string, settleAtMs: number): void {
    clearTimeout(timers.get(orderId));
    timers.set(
      orderId,
      setTimeout(() => {
        timers.delete(orderId);
        settleOrder(db, orderId, getOutcome());
      }, Math.max(settleAtMs - now(), 0)),
    );
  }

  return {
    schedule,
    resume() {
      for (const order of db.read((tables) => Object.values(tables.orders))) {
        if (order.status === "pending" && order.settleAt) schedule(order.id, Date.parse(order.settleAt));
      }
    },
  };
}
