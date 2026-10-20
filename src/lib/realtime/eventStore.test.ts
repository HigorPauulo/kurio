import { describe, expect, it } from "vitest";
import type { NftUpdatedEvent, OrderUpdatedEvent } from "@/contracts/events";
import { createEventStore } from "./eventStore";

function nftEvent(id: string, version: number): NftUpdatedEvent {
  return {
    id,
    type: "nft.updated",
    resource: { kind: "nft", id: "nft_001" },
    version,
    audience: null,
    occurredAt: "2026-10-19T12:00:00.000Z",
    data: { nftId: "nft_001", priceFrom: "1" as never, editions: [] },
  };
}

function orderEvent(id: string, version: number, status: "pending" | "confirmed" | "refused", userId = "usr_ana"): OrderUpdatedEvent {
  return {
    id,
    type: "order.updated",
    resource: { kind: "order", id: "ord_1" },
    version,
    audience: { userId },
    occurredAt: "2026-10-19T12:00:00.000Z",
    data: { orderId: "ord_1", status, transaction: null, refusal: null },
  };
}

describe("eventStore", () => {
  it("descarta duplicata pelo id", () => {
    const store = createEventStore();
    expect(store.accept(nftEvent("evt_1", 1))).toBe(true);
    expect(store.accept(nftEvent("evt_1", 1))).toBe(false);
  });

  it("descarta versão menor ou igual à maior conhecida", () => {
    const store = createEventStore();
    expect(store.accept(nftEvent("evt_2", 2))).toBe(true);
    expect(store.accept(nftEvent("evt_3", 2))).toBe(false);
    expect(store.accept(nftEvent("evt_1", 1))).toBe(false);
    expect(store.accept(nftEvent("evt_4", 3))).toBe(true);
  });

  it("descarta evento anterior a um GET aplicado", () => {
    const store = createEventStore();
    store.seed("nft", "nft_001", 5);
    expect(store.accept(nftEvent("evt_5", 5))).toBe(false);
    expect(store.accept(nftEvent("evt_6", 6))).toBe(true);
  });

  it("descarta evento de outro usuário e aceita depois da troca de identidade", () => {
    const store = createEventStore();
    store.reset("usr_bruno");
    expect(store.accept(orderEvent("evt_1", 1, "pending"))).toBe(false);
    store.reset("usr_ana");
    expect(store.accept(orderEvent("evt_1", 1, "pending"))).toBe(true);
  });

  it("ignora evento de pedido já terminal, por evento ou por REST", () => {
    const store = createEventStore();
    store.reset("usr_ana");
    expect(store.accept(orderEvent("evt_1", 1, "confirmed"))).toBe(true);
    expect(store.accept(orderEvent("evt_2", 2, "refused"))).toBe(false);

    const seeded = createEventStore();
    seeded.reset("usr_ana");
    seeded.seed("order", "ord_1", 1, "refused");
    expect(seeded.accept(orderEvent("evt_3", 2, "confirmed"))).toBe(false);
  });

  it("esquece o id mais antigo além da capacidade, mas a versão ainda barra o reenvio", () => {
    const store = createEventStore(2);
    store.accept(nftEvent("evt_1", 1));
    store.accept(nftEvent("evt_2", 2));
    store.accept(nftEvent("evt_3", 3));
    expect(store.accept(nftEvent("evt_1", 1))).toBe(false);
  });

  it("reset na troca de identidade mantém o que é público e esquece só os pedidos", () => {
    const store = createEventStore();
    store.reset("usr_ana");
    store.accept(nftEvent("evt_1", 6));
    store.accept(orderEvent("evt_2", 1, "confirmed"));

    store.reset("usr_bruno");

    expect(store.accept(nftEvent("evt_3", 5))).toBe(false);
    expect(store.knownVersion("nft", "nft_001")).toBe(6);
    expect(store.knownVersion("order", "ord_1")).toBe(-1);
  });
});
