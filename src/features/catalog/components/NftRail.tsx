import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, type JSX } from "react";
import { useDragScroll } from "@/lib/useDragScroll";
import { cn } from "@/lib/utils";
import { collectionNftsQuery } from "../queries";
import { NftCard, NftCardSkeleton } from "./NftCard";

type CollectionRailProps = { nftId: string; collectionId: string };

type Pages = { count: number; current: number };

function measurePages(list: HTMLElement): Pages {
  const count = Math.max(1, Math.ceil(list.scrollWidth / list.clientWidth - 0.01));
  const maxScroll = list.scrollWidth - list.clientWidth;
  const current = maxScroll > 0 ? Math.round((list.scrollLeft / maxScroll) * (count - 1)) : 0;
  return { count, current };
}

const ITEM = "w-[calc((100%-1rem)/2.2)] shrink-0 snap-start md:w-[calc((100%-3rem)/3)] lg:w-[calc((100%-6rem)/5)]";

export function CollectionRail({ nftId, collectionId }: CollectionRailProps): JSX.Element | null {
  const collection = useQuery(collectionNftsQuery(collectionId));
  const items = collection.data?.items.filter((nft) => nft.id !== nftId) ?? [];
  const listRef = useRef<HTMLUListElement>(null);
  const dragScroll = useDragScroll<HTMLUListElement>();
  const [pages, setPages] = useState<Pages>({ count: 1, current: 0 });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const observer = new ResizeObserver(() => setPages(measurePages(list)));
    observer.observe(list);
    return () => observer.disconnect();
  }, [items.length]);

  function goToPage(page: number): void {
    const list = listRef.current;
    if (!list) return;
    const maxScroll = list.scrollWidth - list.clientWidth;
    list.scrollTo({ left: pages.count > 1 ? (maxScroll * page) / (pages.count - 1) : 0, behavior: "smooth" });
  }

  if (collection.isError || (collection.data && items.length === 0)) return null;

  return (
    <section aria-labelledby="collection-title" className="flex flex-col gap-7">
      <h2 id="collection-title" className="border-b border-border-strong pb-3 text-lg font-bold text-text-accent">
        Mais desta coleção
      </h2>
      {collection.isPending ? (
        <div aria-busy="true" className="flex gap-4 overflow-hidden lg:gap-6">
          <p className="sr-only">Carregando a coleção...</p>
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className={ITEM}>
              <NftCardSkeleton />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul
            ref={listRef}
            aria-label="NFTs da mesma coleção"
            onScroll={(event) => setPages(measurePages(event.currentTarget))}
            {...dragScroll}
            className="flex cursor-grab snap-x snap-proximity gap-4 overflow-x-auto pb-2 select-none [scrollbar-width:none] lg:gap-6 [&::-webkit-scrollbar]:hidden"
          >
            {items.map((nft) => (
              <li key={nft.id} className={ITEM}>
                <NftCard nft={nft} />
              </li>
            ))}
          </ul>
          {pages.count > 1 && (
            <div className="flex justify-center gap-1">
              {Array.from({ length: pages.count }, (_, page) => (
                <button
                  key={page}
                  type="button"
                  aria-label={`Mostrar a página ${page + 1} de ${pages.count} da coleção`}
                  aria-current={page === pages.current ? "true" : undefined}
                  onClick={() => goToPage(page)}
                  className="flex size-6 items-center justify-center rounded-full"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2.5 rounded-full border border-primary transition-all",
                      page === pages.current ? "w-5 bg-primary" : "w-2.5 bg-transparent",
                    )}
                  />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
