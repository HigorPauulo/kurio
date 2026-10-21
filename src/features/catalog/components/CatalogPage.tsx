import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState, type JSX } from "react";
import { ChevronDownIcon, SearchCurvedIcon } from "@/components/icons/KurioIcons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalogSortSchema } from "@/contracts/nft";
import { useNftSubscription } from "@/lib/realtime/instance";
import { formatEth } from "@/lib/eth";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import { SORT_LABELS, STATUS_LABELS, VIEW_TABS } from "../labels";
import { catalogListQuery, featuredNftsQuery } from "../queries";
import { CATALOG_PAGE_SIZE, CLEARED_FILTERS, hasActiveFilters, type CatalogFilters, type CatalogSearch, type CatalogSort } from "../search";
import { CatalogFiltersPanel } from "./CatalogFilters";
import { HeroCarousel } from "./HeroCarousel";
import { HomeEditorial } from "./HomeSections";
import { NftCard, NftCardSkeleton } from "./NftCard";

export type SearchChange = (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => void;

type CatalogPageProps = {
  search: CatalogSearch;
  onSearchChange: SearchChange;
};

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_DELAY_MS = 150;
const COMPACT_QUERY = "(width < 48rem)";
const PRIORITY_CARDS = 2;
const GRID = "grid grid-cols-2 gap-x-4 gap-y-8 max-md:pb-8 max-md:[&>:nth-child(even)]:translate-y-8 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-18";
const PAGE_ITEM =
  "flex size-9 items-center justify-center rounded-sm border border-border-strong text-lg leading-4 hover:border-primary hover:text-text-accent";

function SearchBox({ value, onSearchChange }: { value: string | undefined; onSearchChange: SearchChange }): JSX.Element {
  const [draft, setDraft] = useState(value ?? "");
  const [syncedValue, setSyncedValue] = useState(value);
  const [sentValue, setSentValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if (value !== sentValue) {
      setSentValue(value);
      setDraft(value ?? "");
    }
  }

  useEffect(() => {
    const next = draft.trim() || undefined;
    if (next === value) return;
    const timer = setTimeout(() => {
      setSentValue(next);
      onSearchChange({ q: next }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onSearchChange]);

  return (
    <div role="search" className="min-w-0 flex-1">
      <Label htmlFor="catalog-search" className="sr-only">
        Buscar NFTs
      </Label>
      <div className="relative">
        <SearchCurvedIcon className="absolute top-1/2 left-3 size-5.5 -translate-y-1/2 text-secondary-base" />
        <Input
          id="catalog-search"
          type="search"
          maxLength={80}
          placeholder="Explorar coleções"
          className="h-11.25 scroll-mt-6 rounded-[0.625rem] border-transparent bg-surface-card pl-11 text-base placeholder:font-bold md:text-body placeholder:text-secondary-base"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
    </div>
  );
}

function ViewTabs({ view }: { view: CatalogSearch["view"] }): JSX.Element {
  return (
    <ul aria-label="Vistas do catálogo" className="flex max-w-full min-w-0 gap-5 overflow-x-auto text-body leading-4 font-medium">
      {VIEW_TABS.map((tab) => (
        <li key={tab.label} className="shrink-0">
          <Link
            to="/"
            search={(previous) => ({ ...previous, view: tab.view, page: undefined })}
            resetScroll={false}
            aria-current={tab.view === view ? "true" : undefined}
            data-active={tab.view === view}
            activeOptions={{ exact: true, includeSearch: true, includeHash: true }}
            className="relative block pb-2 whitespace-nowrap hover:text-text-accent data-[active=true]:text-text-accent data-[active=true]:after:absolute data-[active=true]:after:inset-x-0 data-[active=true]:after:bottom-0 data-[active=true]:after:h-0.5 data-[active=true]:after:bg-primary"
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SortSelect({ value, onSearchChange }: { value: CatalogSort; onSearchChange: SearchChange }): JSX.Element {
  return (
    <div className="relative flex max-w-full min-w-0 items-center gap-2 text-body">
      <label htmlFor="catalog-sort" className="shrink-0 whitespace-nowrap">
        <span aria-hidden="true" className="md:hidden">
          Ordenar:
        </span>
        <span className="max-md:sr-only">Ordenar por:</span>
      </label>
      <select
        id="catalog-sort"
        className="h-9 min-w-0 cursor-pointer appearance-none rounded-md bg-background pr-6 text-base text-foreground md:text-body hover:text-text-accent"
        value={value}
        onChange={(event) => {
          const sort = catalogSortSchema.parse(event.target.value);
          onSearchChange({ sort: sort === "recent" ? undefined : sort });
        }}
      >
        {catalogSortSchema.options.map((sort) => (
          <option key={sort} value={sort}>
            {SORT_LABELS[sort]}
          </option>
        ))}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-0 size-4" />
    </div>
  );
}

function pageHref(page: number): (previous: CatalogSearch) => CatalogSearch {
  return (previous) => ({ ...previous, page: page > 1 ? page : undefined });
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }): JSX.Element | null {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-end gap-2">
      {page > 1 && (
        <Link to="/" hash="mercado" search={pageHref(page - 1)} aria-label="Página anterior" className={PAGE_ITEM}>
          <ChevronLeft aria-hidden="true" className="size-4.5" />
        </Link>
      )}
      {pages.map((number) => (
        <Link
          key={number}
          to="/"
          hash="mercado"
          search={pageHref(number)}
          aria-label={`Página ${number}`}
          aria-current={number === page ? "page" : undefined}
          className={cn(PAGE_ITEM, "aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:font-bold aria-[current=page]:text-primary-foreground")}
        >
          {number}
        </Link>
      ))}
      {page < totalPages && (
        <Link to="/" hash="mercado" search={pageHref(page + 1)} aria-label="Próxima página" className={PAGE_ITEM}>
          <ChevronRight aria-hidden="true" className="size-4.5" />
        </Link>
      )}
    </nav>
  );
}

const FEATURED_SECTION = "relative flex flex-col gap-4 bg-linear-to-b from-primary/10 to-primary/3 pt-6 pb-1";

function FeaturedHeading(): JSX.Element {
  return (
    <div className="flex flex-col gap-4 px-5">
      <h2 id="featured-title" className="text-center text-2xl leading-8 font-bold text-text-accent uppercase">
        NFT em destaque
      </h2>
      <p className="text-center text-title leading-4 font-bold uppercase">Oferta limitada</p>
    </div>
  );
}

function FeaturedNft(): JSX.Element | null {
  const featured = useQuery(featuredNftsQuery());
  const highlight = featured.data?.[0];
  useNftSubscription(highlight ? [highlight.id] : []);

  if (featured.isError && !featured.data) {
    return (
      <section aria-labelledby="featured-title" className="flex flex-col items-start gap-3 bg-surface-card p-5">
        <h2 id="featured-title" className="text-2xl font-bold text-text-accent">
          NFT em destaque
        </h2>
        <p role="alert" className="text-sm">
          Não foi possível carregar os destaques.
        </p>
        <Button variant="outline" size="sm" onClick={() => void featured.refetch()}>
          Tentar de novo
        </Button>
      </section>
    );
  }
  if (featured.isPending) {
    return (
      <section aria-labelledby="featured-title" aria-busy="true" className={FEATURED_SECTION}>
        <FeaturedHeading />
        <div className="skeleton aspect-310/368 w-full rounded-[1.375rem]" />
      </section>
    );
  }
  if (!highlight) return null;

  return (
    <section aria-labelledby="featured-title" className={FEATURED_SECTION}>
      <FeaturedHeading />
      <Link
        to="/nft/$nftId"
        params={{ nftId: highlight.id }}
        className="group relative block overflow-hidden rounded-[1.375rem] outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <img
          src={highlight.cover.url}
          alt={highlight.cover.alt}
          width={highlight.cover.width}
          height={highlight.cover.height}
          loading="lazy"
          decoding="async"
          className="aspect-310/368 w-full object-cover"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-linear-to-t from-ink/90 to-transparent p-4 pt-12">
          <span className="font-bold">{highlight.name}</span>
          <span className="text-lg font-bold whitespace-nowrap text-text-accent">{formatEth(highlight.priceFrom)} ETH</span>
        </span>
      </Link>
    </section>
  );
}

function ResultCount({ search }: { search: CatalogSearch }): JSX.Element {
  const list = useQuery(catalogListQuery(search));
  const isRefreshing = list.isPlaceholderData && list.isFetching;
  const total = list.data?.total;
  let message = "";
  if (list.isPending) message = "Carregando NFTs...";
  else if (isRefreshing) message = "Atualizando resultados...";
  else if (total !== undefined) message = `${total} ${total === 1 ? "NFT encontrado" : "NFTs encontrados"}`;

  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}

function CatalogResults({ search, onSearchChange }: CatalogPageProps): JSX.Element {
  const list = useQuery(catalogListQuery(search));
  useNftSubscription(list.data?.items.map((nft) => nft.id) ?? []);
  const isSkeletonVisible = useDelayedFlag(list.isPending, SKELETON_DELAY_MS);
  const page = search.page ?? 1;

  if (list.isPending) {
    return (
      <div aria-busy="true" className="flex flex-col gap-10 lg:gap-22">
        <div className={cn(GRID, !isSkeletonVisible && "[&>:not(p)]:invisible")}>
          {Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
          <p className="sr-only">Carregando NFTs...</p>
        </div>
        <div aria-hidden="true" className="h-9" />
      </div>
    );
  }

  if (list.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 bg-surface-card p-6">
        <p className="text-lg font-bold">Não foi possível carregar o catálogo.</p>
        <Button variant="outline" onClick={() => void list.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const { items, total, totalPages } = list.data;
  const isRefreshing = list.isPlaceholderData && list.isFetching;

  if (total === 0) {
    return (
      <div className="flex flex-col items-start gap-3 bg-surface-card p-6">
        <p className="text-lg font-bold">Nenhum NFT encontrado.</p>
        {hasActiveFilters(search) ? (
          <Button
            variant="outline"
            onClick={() => onSearchChange({ ...CLEARED_FILTERS, q: undefined, view: undefined })}
          >
            Limpar filtros
          </Button>
        ) : (
          <p className="text-sm text-text-secondary">O catálogo está vazio no momento.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 lg:gap-22">
      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p>Esta página não existe mais.</p>
          <Link to="/" hash="mercado" search={pageHref(1)} className="underline underline-offset-4">
            Ir para a primeira página
          </Link>
        </div>
      ) : (
        <ul aria-label="Resultados" aria-busy={isRefreshing} className={cn(GRID, isRefreshing && "opacity-70")}>
          {items.map((nft, index) => (
            <li key={nft.id}>
              <NftCard nft={nft} isPriority={index < PRIORITY_CARDS} />
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} />
    </div>
  );
}

export function CatalogPage({ search, onSearchChange }: CatalogPageProps): JSX.Element {
  const isCompact = useMediaQuery(COMPACT_QUERY);
  const filters: CatalogFilters = {
    category: search.category,
    chain: search.chain,
    status: search.status,
    priceMin: search.priceMin,
    priceMax: search.priceMax,
  };
  const facets = useQuery(catalogListQuery(search)).data?.facets;
  const searchBox = <SearchBox value={search.q} onSearchChange={onSearchChange} />;

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-6 px-page pt-6 md:gap-24 md:pt-8">
      {isCompact && (
        <div className="flex items-center gap-3">
          {searchBox}
          <CatalogFiltersPanel isCompact filters={filters} facets={facets} onApply={onSearchChange} />
        </div>
      )}
      <HeroCarousel />
      <section id="mercado" aria-labelledby="market-title" className="flex scroll-mt-6 flex-col gap-8 md:grid md:grid-cols-[15rem_1fr] md:items-start md:gap-8 lg:grid-cols-[19.375rem_1fr] lg:gap-12">
        <h2 id="market-title" className="sr-only">
          Mercado
        </h2>
        <div className="order-last flex flex-col gap-6 md:order-none">
          {!isCompact && <CatalogFiltersPanel isCompact={false} filters={filters} facets={facets} onApply={onSearchChange} />}
          <FeaturedNft />
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex max-w-full min-w-0 flex-wrap items-center gap-x-5 gap-y-3">
              <ViewTabs view={search.view} />
              {search.q && (
                <button
                  type="button"
                  aria-label={`Limpar a busca por ${search.q}`}
                  onClick={() => onSearchChange({ q: undefined })}
                  className="flex h-7 items-center gap-1.5 rounded-full border border-input px-3 text-caption text-text-secondary hover:border-primary hover:text-text-accent"
                >
                  Busca: <strong className="font-bold text-foreground">{search.q}</strong>
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
              {search.status && (
                <button
                  type="button"
                  aria-label={`Limpar o filtro ${STATUS_LABELS[search.status]}`}
                  onClick={() => onSearchChange({ status: undefined })}
                  className="flex h-7 items-center gap-1.5 rounded-full border border-input px-3 text-caption text-text-secondary hover:border-primary hover:text-text-accent"
                >
                  Disponibilidade: <strong className="font-bold text-foreground">{STATUS_LABELS[search.status]}</strong>
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              )}
            </div>
            <SortSelect value={search.sort ?? "recent"} onSearchChange={onSearchChange} />
            <ResultCount search={search} />
          </div>
          <CatalogResults search={search} onSearchChange={onSearchChange} />
        </div>
      </section>
      <HomeEditorial />
    </main>
  );
}
