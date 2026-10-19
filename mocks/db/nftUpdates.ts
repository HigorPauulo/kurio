import type { Edition, Nft } from "@/contracts/nft";
import type { NftUpdatedEvent } from "@/contracts/events";
import { minEth } from "@/lib/eth";

export function editionStatusFor(edition: Edition): Edition["status"] {
  if (edition.status === "unavailable") return "unavailable";
  return edition.available > 0 ? "available" : "sold_out";
}

export function refreshNft(nft: Nft): void {
  for (const edition of nft.editions) edition.status = editionStatusFor(edition);
  nft.priceFrom = nft.editions.map((edition) => edition.price).reduce(minEth);
}

export function nftUpdatedData(nft: Nft): NftUpdatedEvent["data"] {
  return {
    nftId: nft.id,
    priceFrom: nft.priceFrom,
    editions: nft.editions.map(({ id, price, available, status }) => ({
      editionId: id,
      price,
      available,
      status,
    })),
  };
}
