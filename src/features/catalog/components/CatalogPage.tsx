import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalogSortSchema } from "@/contracts/nft";
import { useDelayedFlag } from "@/lib/useDelayedFlag";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { SORT_LABELS } from "../labels";
import { catalogListQuery, featuredNftsQuery } from "../queries";
import { CATALOG_PAGE_SIZE, hasActiveFilters, type CatalogFilters, type CatalogSearch, type CatalogSort } from "../search";
import { CatalogFiltersPanel } from "./CatalogFilters";
import { NftCard, NftCardSkeleton } from "./NftCard";

export type SearchChange = (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => void;

type CatalogPageProps = {
  search: CatalogSearch;
  onSearchChange: SearchChange;
};

const SEARCH_DEBOUNCE_MS = 300;
const SKELETON_DELAY_MS = 150;
const COMPACT_QUERY = "(max-width: 767px)";

function SearchBox({ value, onSearchChange }: { value: string | undefined; onSearchChange: SearchChange }): JSX.Element {
  const [draft, setDraft] = useState(value ?? "");
  const [syncedValue, setSyncedValue] = useState(value);

  if (value !== syncedValue) {
    setSyncedValue(value);
    if (draft.trim() !== (value ?? "")) setDraft(value ?? "");
  }

  useEffect(() => {
    const next = draft.trim() || undefined;
    if (next === value) return;
    const timer = setTimeout(() => onSearchChange({ q: next }, { replace: true }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, value, onSearchChange]);

  return (
    <div role="search" className="flex flex-col gap-1.5">
      <Label htmlFor="catalog-search">Buscar NFTs</Label>
      <div className="relative">
        <Search aria-hidden="true" className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="catalog-search"
          type="search"
          maxLength={80}
          placeholder="Nome, coleção ou criador"
          className="pl-8"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </div>
    </div>
  );
}

function SortSelect({ value, onSearchChange }: { value: CatalogSort; onSearchChange: SearchChange }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="catalog-sort" className="text-sm font-medium">
        Ordenar por
      </label>
      <select
        id="catalog-sort"
        className="h-8 rounded-lg border bg-background px-2 text-sm"
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
    <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link to="/" search={pageHref(page - 1)} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm">
          <ChevronLeft aria-hidden="true" className="size-4" />
          Anterior
        </Link>
      )}
      {pages.map((number) => (
        <Link
          key={number}
          to="/"
          search={pageHref(number)}
          aria-label={`Página ${number}`}
          aria-current={number === page ? "page" : undefined}
          className="rounded-lg border px-2.5 py-1 text-sm aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
        >
          {number}
        </Link>
      ))}
      {page < totalPages && (
        <Link to="/" search={pageHref(page + 1)} className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm">
          Próxima
          <ChevronRight aria-hidden="true" className="size-4" />
        </Link>
      )}
    </nav>
  );
}

function FeaturedNfts(): JSX.Element | null {
  const featured = useQuery(featuredNftsQuery());
  if (!featured.data?.length) return null;

  return (
    <section aria-labelledby="featured-title" className="flex flex-col gap-4">
      <h2 id="featured-title" className="text-xl font-semibold">
        Em destaque
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {featured.data.map((nft) => (
          <li key={nft.id}>
            <NftCard nft={nft} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function CatalogResults({ search, onSearchChange }: CatalogPageProps): JSX.Element {
  const list = useQuery(catalogListQuery(search));
  const isSkeletonVisible = useDelayedFlag(list.isPending, SKELETON_DELAY_MS);
  const page = search.page ?? 1;

  if (list.isPending) {
    return (
      <div aria-busy="true" aria-label="Carregando NFTs" className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {isSkeletonVisible &&
          Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => <NftCardSkeleton key={index} />)}
      </div>
    );
  }

  if (list.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Não foi possível carregar o catálogo.</p>
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
      <div className="flex flex-col items-start gap-2">
        <p className="font-medium">Nenhum NFT encontrado.</p>
        {hasActiveFilters(search) ? (
          <Button
            variant="outline"
            onClick={() =>
              onSearchChange({ q: undefined, category: undefined, chain: undefined, status: undefined, priceMin: undefined, priceMax: undefined })
            }
          >
            Limpar filtros
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">O catálogo está vazio no momento.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p role="status" className="text-sm text-muted-foreground">
        {isRefreshing ? "Atualizando resultados..." : `${total} ${total === 1 ? "NFT encontrado" : "NFTs encontrados"}`}
      </p>
      {items.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p>Esta página não existe mais.</p>
          <Link to="/" search={pageHref(1)} className="underline underline-offset-4">
            Ir para a primeira página
          </Link>
        </div>
      ) : (
        <ul aria-label="Resultados" aria-busy={isRefreshing} className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {items.map((nft) => (
            <li key={nft.id}>
              <NftCard nft={nft} />
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

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 p-4 md:p-6">
      <h1 className="text-2xl font-semibold md:text-3xl">Seja dono do futuro da arte digital</h1>
      <FeaturedNfts />
      <section aria-labelledby="market-title" className="flex flex-col gap-4">
        <h2 id="market-title" className="text-xl font-semibold">
          Mercado
        </h2>
        <SearchBox value={search.q} onSearchChange={onSearchChange} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {isCompact && <CatalogFiltersPanel isCompact filters={filters} onApply={onSearchChange} />}
          <SortSelect value={search.sort ?? "recent"} onSearchChange={onSearchChange} />
        </div>
        <div className="flex gap-8">
          {!isCompact && <CatalogFiltersPanel isCompact={false} filters={filters} onApply={onSearchChange} />}
          <div className="min-w-0 flex-1">
            <CatalogResults search={search} onSearchChange={onSearchChange} />
          </div>
        </div>
      </section>
    </main>
  );
}
