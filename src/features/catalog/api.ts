import {
  favoritesResponseSchema,
  featuredNftsResponseSchema,
  nftListResponseSchema,
  nftSchema,
  reviewsResponseSchema,
  type Nft,
  type NftListResponse,
  type NftSummary,
  type ReviewsResponse,
} from "@/contracts/nft";
import { parseResponse } from "@/lib/http/apiError";
import { http } from "@/lib/http/client";
import { CATALOG_PAGE_SIZE, COLLECTION_PAGE_SIZE, REVIEWS_PAGE_SIZE, type CatalogSearch } from "./search";

export async function getNfts(search: CatalogSearch, signal?: AbortSignal): Promise<NftListResponse> {
  const { data } = await http.get<unknown>("/nfts", { params: { ...search, pageSize: CATALOG_PAGE_SIZE }, signal });
  return parseResponse(nftListResponseSchema, data);
}

export async function getCollectionNfts(collectionId: string, signal?: AbortSignal): Promise<NftListResponse> {
  const { data } = await http.get<unknown>("/nfts", {
    params: { collection: collectionId, pageSize: COLLECTION_PAGE_SIZE },
    signal,
  });
  return parseResponse(nftListResponseSchema, data);
}

export async function getNftReviews(nftId: string, page: number, signal?: AbortSignal): Promise<ReviewsResponse> {
  const { data } = await http.get<unknown>(`/nfts/${encodeURIComponent(nftId)}/reviews`, {
    params: { page, pageSize: REVIEWS_PAGE_SIZE },
    signal,
  });
  return parseResponse(reviewsResponseSchema, data);
}

export async function getFeaturedNfts(signal?: AbortSignal): Promise<NftSummary[]> {
  const { data } = await http.get<unknown>("/nfts/featured", { signal });
  return parseResponse(featuredNftsResponseSchema, data);
}

export async function getNft(nftId: string, signal?: AbortSignal): Promise<Nft> {
  const { data } = await http.get<unknown>(`/nfts/${encodeURIComponent(nftId)}`, { signal });
  return parseResponse(nftSchema, data);
}

export async function getFavorites(signal?: AbortSignal): Promise<string[]> {
  const { data } = await http.get<unknown>("/me/favorites", { signal });
  return parseResponse(favoritesResponseSchema, data).nftIds;
}

export async function addFavorite(nftId: string): Promise<void> {
  await http.put(`/me/favorites/${encodeURIComponent(nftId)}`);
}

export async function removeFavorite(nftId: string): Promise<void> {
  await http.delete(`/me/favorites/${encodeURIComponent(nftId)}`);
}
