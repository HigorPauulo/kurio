import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { Cart } from "@/contracts/cart";
import type { NftUpdatedEvent, OrderUpdatedEvent, RealtimeEvent } from "@/contracts/events";
import type { Nft, NftListResponse, NftSummary } from "@/contracts/nft";
import { isTerminalOrderStatus } from "@/contracts/order";
import { announce } from "@/lib/a11y/announcer";
import { keys } from "@/lib/query/keys";

const PRICE_DEPENDENT_PARAMS = ["priceMin", "priceMax", "status"];
const PRICE_SORTS = new Set(["price_asc", "price_desc"]);

function isPrivateKind(key: QueryKey, kind: string): boolean {
  return key[0] === "u" && key[2] === kind;
}

function patchNft(nft: Nft | undefined, data: NftUpdatedEvent["data"], version: number): Nft | undefined {
  if (!nft) return nft;
  return {
    ...nft,
    priceFrom: data.priceFrom,
    version,
    editions: nft.editions.map((edition) => {
      const update = data.editions.find((candidate) => candidate.editionId === edition.id);
      return update ? { ...edition, price: update.price, available: update.available, status: update.status } : edition;
    }),
  };
}

function patchSummary(summary: NftSummary, data: NftUpdatedEvent["data"], version: number): NftSummary {
  const isAvailable = data.editions.some((edition) => edition.status === "available");
  return { ...summary, priceFrom: data.priceFrom, version, status: isAvailable ? "available" : "sold_out" };
}

function dependsOnPrice(key: QueryKey): boolean {
  const query = key[2];
  if (typeof query !== "object" || query === null) return false;
  const params = query as Record<string, unknown>;
  return PRICE_DEPENDENT_PARAMS.some((param) => params[param] !== undefined) || PRICE_SORTS.has(String(params.sort));
}

function applyNftUpdated(queryClient: QueryClient, event: NftUpdatedEvent): void {
  const { data, version } = event;
  queryClient.setQueryData<Nft>(keys.nft(data.nftId), (nft) => patchNft(nft, data, version));
  queryClient.setQueryData<NftSummary[]>(keys.catalog.featured, (list) =>
    list?.map((summary) => (summary.id === data.nftId ? patchSummary(summary, data, version) : summary)),
  );

  for (const [key, list] of queryClient.getQueriesData<NftListResponse>({ queryKey: [...keys.catalog.all, "list"] })) {
    if (!list?.items.some((summary) => summary.id === data.nftId)) continue;
    if (dependsOnPrice(key)) {
      void queryClient.invalidateQueries({ queryKey: key, exact: true });
      continue;
    }
    queryClient.setQueryData<NftListResponse>(key, {
      ...list,
      items: list.items.map((summary) => (summary.id === data.nftId ? patchSummary(summary, data, version) : summary)),
    });
  }

  const carts = queryClient.getQueriesData<Cart>({ predicate: (query) => isPrivateKind(query.queryKey, "cart") });
  const affectedOwners = new Set<unknown>();
  let affectedName: string | undefined;
  for (const [key, cart] of carts) {
    const item = cart?.items.find((candidate) => candidate.nftId === data.nftId);
    if (!item) continue;
    affectedOwners.add(key[1]);
    affectedName = item.nftName;
  }
  if (!affectedName) return;

  void queryClient.invalidateQueries({
    predicate: (query) =>
      affectedOwners.has(query.queryKey[1]) &&
      (isPrivateKind(query.queryKey, "cart") || isPrivateKind(query.queryKey, "quote")),
  });
  announce(`O preço ou a disponibilidade de ${affectedName} mudou. O resumo do carrinho foi atualizado.`);
}

function applyOrderUpdated(queryClient: QueryClient, event: OrderUpdatedEvent): void {
  void queryClient.invalidateQueries({
    predicate: (query) => isPrivateKind(query.queryKey, "order") && query.queryKey[3] === event.data.orderId,
  });
  if (!isTerminalOrderStatus(event.data.status)) return;
  void queryClient.invalidateQueries({ predicate: (query) => isPrivateKind(query.queryKey, "cart") });
  void queryClient.invalidateQueries({ queryKey: keys.catalog.all });
}

export function applyRealtimeEvent(queryClient: QueryClient, event: RealtimeEvent): void {
  if (event.type === "nft.updated") applyNftUpdated(queryClient, event);
  else applyOrderUpdated(queryClient, event);
}

export function reconcileAfterReconnect(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: keys.catalog.all });
  void queryClient.invalidateQueries({ queryKey: ["nft"] });
  void queryClient.invalidateQueries({
    predicate: (query) => ["cart", "quote", "order"].some((kind) => isPrivateKind(query.queryKey, kind)),
  });
}
