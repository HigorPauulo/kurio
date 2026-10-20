import { Link } from "@tanstack/react-router";
import { CircleOff } from "lucide-react";
import type { JSX } from "react";
import type { NftSummary } from "@/contracts/nft";
import { formatEth } from "@/lib/eth";

export function NftCard({ nft }: { nft: NftSummary }): JSX.Element {
  const isSoldOut = nft.status === "sold_out";

  return (
    <article className="group relative flex flex-col gap-3 rounded-md focus-within:ring-3 focus-within:ring-ring/60">
      <div className="relative bg-surface-card px-1 pt-6 pb-7">
        <img
          src={nft.cover.url}
          alt={nft.cover.alt}
          width={nft.cover.width}
          height={nft.cover.height}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-2xl bg-surface-raised object-cover transition-transform group-hover:scale-[1.02]"
        />
        {isSoldOut && (
          <p className="absolute top-0 left-0 flex items-center gap-1 bg-primary px-2 py-1 text-xs font-bold text-primary-foreground uppercase">
            <CircleOff aria-hidden="true" className="size-3.5" />
            Esgotado
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base leading-4">
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="outline-none after:absolute after:inset-0">
            {nft.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-secondary-base">
          A partir de{" "}
          <strong className="text-lg leading-4 font-bold whitespace-nowrap text-text-accent">{formatEth(nft.priceFrom)} ETH</strong>
        </p>
      </div>
    </article>
  );
}

export function NftCardSkeleton(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      <div className="bg-surface-card px-1 pt-6 pb-7">
        <div className="skeleton aspect-square w-full rounded-2xl" />
      </div>
      <div className="skeleton h-4 w-3/4 rounded-sm" />
      <div className="skeleton h-4 w-1/2 rounded-sm" />
    </div>
  );
}
