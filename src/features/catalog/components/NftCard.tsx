import { Link } from "@tanstack/react-router";
import { CircleOff } from "lucide-react";
import type { JSX } from "react";
import type { NftSummary } from "@/contracts/nft";
import { formatEth } from "@/lib/eth";
import { CHAIN_LABELS } from "../labels";

export function NftCard({ nft }: { nft: NftSummary }): JSX.Element {
  const isSoldOut = nft.status === "sold_out";

  return (
    <article className="relative flex flex-col gap-2 rounded-xl border p-3 focus-within:ring-3 focus-within:ring-ring/50">
      <img
        src={nft.cover.url}
        alt={nft.cover.alt}
        width={nft.cover.width}
        height={nft.cover.height}
        loading="lazy"
        className="aspect-square w-full rounded-lg bg-muted object-cover"
      />
      <h3 className="font-medium">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="outline-none after:absolute after:inset-0">
          {nft.name}
        </Link>
      </h3>
      <p className="text-sm text-muted-foreground">
        {nft.collection.name} · {CHAIN_LABELS[nft.chain]}
      </p>
      <p className="text-sm">
        A partir de <strong>{formatEth(nft.priceFrom)} ETH</strong>
      </p>
      {isSoldOut && (
        <p className="flex items-center gap-1 text-sm font-medium text-destructive">
          <CircleOff aria-hidden="true" className="size-4" />
          Esgotado
        </p>
      )}
    </article>
  );
}

export function NftCardSkeleton(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="aspect-square w-full rounded-lg bg-muted motion-safe:animate-pulse" />
      <div className="h-5 w-3/4 rounded bg-muted motion-safe:animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-muted motion-safe:animate-pulse" />
      <div className="h-4 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
    </div>
  );
}
