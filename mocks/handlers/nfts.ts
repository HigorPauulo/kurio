import { http, HttpResponse, type HttpHandler } from "msw";
import { categorySchema, chainSchema } from "@/contracts/common";
import {
  type CatalogFacets,
  nftListQuerySchema,
  nftSchema,
  nftSummarySchema,
  type Nft,
  type NftListQuery,
  type NftSummary,
} from "@/contracts/nft";
import { compareEth, maxEth, minEth } from "@/lib/eth";
import { stripAccents } from "../text";
import { API, apiError, withConditions, type HandlerDeps } from "./shared";

const FEATURED_LIMIT = 6;

export function normalizeSearchText(value: string): string {
  return stripAccents(value).toLowerCase();
}

export function toNftSummary(nft: Nft): NftSummary {
  const isAvailable = nft.editions.some((edition) => edition.status === "available");
  return nftSummarySchema.parse({ ...nft, cover: nft.images[0], status: isAvailable ? "available" : "sold_out" });
}

function matchesQuery(summary: NftSummary, query: NftListQuery): boolean {
  if (query.q) {
    const needle = normalizeSearchText(query.q);
    const haystack = [summary.name, summary.collection.name, summary.creator.name].map(normalizeSearchText);
    if (!haystack.some((text) => text.includes(needle))) return false;
  }
  if (query.category && !query.category.includes(summary.category)) return false;
  if (query.chain && !query.chain.includes(summary.chain)) return false;
  if (query.status && summary.status !== query.status) return false;
  if (query.priceMin && compareEth(summary.priceFrom, query.priceMin) < 0) return false;
  if (query.priceMax && compareEth(summary.priceFrom, query.priceMax) > 0) return false;
  return true;
}

function countBy<Key extends string>(keys: readonly Key[], values: Key[]): Record<Key, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<Key, number>;
  for (const value of values) counts[value] += 1;
  return counts;
}

function buildFacets(summaries: NftSummary[], query: NftListQuery): CatalogFacets {
  const byCategory = summaries.filter((summary) => matchesQuery(summary, { ...query, category: undefined }));
  const byChain = summaries.filter((summary) => matchesQuery(summary, { ...query, chain: undefined }));
  const byPrice = summaries.filter((summary) => matchesQuery(summary, { ...query, priceMin: undefined, priceMax: undefined }));
  const prices = byPrice.map((summary) => summary.priceFrom);

  return {
    category: countBy(categorySchema.options, byCategory.map((summary) => summary.category)),
    chain: countBy(chainSchema.options, byChain.map((summary) => summary.chain)),
    price: prices.length ? { min: prices.reduce(minEth), max: prices.reduce(maxEth) } : null,
  };
}

function compareBySort(sort: NftListQuery["sort"], createdAt: Map<string, string>) {
  return (left: NftSummary, right: NftSummary): number => {
    const primary = {
      recent: () => (createdAt.get(right.id) ?? "").localeCompare(createdAt.get(left.id) ?? ""),
      price_asc: () => compareEth(left.priceFrom, right.priceFrom),
      price_desc: () => compareEth(right.priceFrom, left.priceFrom),
      popular: () => right.likes - left.likes,
    }[sort]();
    return primary || left.id.localeCompare(right.id);
  };
}

export function nftHandlers(deps: HandlerDeps): HttpHandler[] {
  const { db } = deps;

  function allNfts(): Nft[] {
    if (deps.getScenario().flags.emptyCatalog) return [];
    return db.read((tables) => Object.values(tables.nfts));
  }

  return [
    http.get(
      `${API}/nfts`,
      withConditions(deps, ({ request }) => {
        const params = Object.fromEntries(new URL(request.url).searchParams);
        const parsed = nftListQuerySchema.safeParse(params);
        if (!parsed.success) {
          return apiError(request, 400, "BAD_REQUEST", parsed.error.issues[0]?.message ?? "Parâmetros inválidos.");
        }
        const query = parsed.data;

        const nfts = allNfts();
        const createdAt = new Map(nfts.map((nft) => [nft.id, nft.createdAt]));
        const summaries = nfts.map(toNftSummary);
        const matching = summaries
          .filter((summary) => matchesQuery(summary, query))
          .sort(compareBySort(query.sort, createdAt));
        const start = (query.page - 1) * query.pageSize;

        return HttpResponse.json({
          items: matching.slice(start, start + query.pageSize),
          page: query.page,
          pageSize: query.pageSize,
          total: matching.length,
          totalPages: Math.ceil(matching.length / query.pageSize),
          appliedQuery: query,
          facets: buildFacets(summaries, query),
        });
      }),
    ),

    http.get(
      `${API}/nfts/featured`,
      withConditions(deps, () =>
        HttpResponse.json(
          allNfts()
            .filter((nft) => nft.featured)
            .slice(0, FEATURED_LIMIT)
            .map(toNftSummary),
        ),
      ),
    ),

    http.get(
      `${API}/nfts/:nftId`,
      withConditions(deps, ({ request, params }) => {
        const nft = allNfts().find((candidate) => candidate.id === String(params.nftId));
        if (!nft) return apiError(request, 404, "NOT_FOUND", "NFT não encontrado.");
        return HttpResponse.json(nftSchema.parse(nft));
      }),
    ),
  ];
}
