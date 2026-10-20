import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQueryClient,
  type DataTag,
  type QueryClient,
  type UseMutationResult,
  type UseQueryOptions,
} from "@tanstack/react-query";
import type { Nft, NftListResponse, NftSummary } from "@/contracts/nft";
import { announce } from "@/lib/a11y/announcer";
import { ApiError } from "@/lib/http/apiError";
import { toggleItem } from "@/lib/list";
import { ensureDespiteCancel } from "@/lib/query/ensure";
import { keys } from "@/lib/query/keys";
import { seedNftVersions } from "@/lib/query/versions";
import { addFavorite, getCollectionNfts, getFavorites, getFeaturedNfts, getNft, getNfts, removeFavorite } from "./api";
import type { CatalogSearch } from "./search";

const THIRTY_SECONDS = 30_000;
const ONE_MINUTE = 60_000;
const FIVE_MINUTES = 5 * ONE_MINUTE;

type TaggedQueryOptions<TData, TKey extends readonly unknown[]> = UseQueryOptions<TData, Error, TData, TKey> & {
  queryKey: DataTag<TKey, TData, Error>;
};

type ListKey = ReturnType<typeof keys.catalog.list<CatalogSearch>>;
type FavoritesKey = ReturnType<typeof keys.priv>["favorites"];

export function catalogListQuery(search: CatalogSearch): TaggedQueryOptions<NftListResponse, ListKey> {
  return queryOptions({
    queryKey: keys.catalog.list(search),
    queryFn: ({ signal }) => seedNftVersions(() => getNfts(search, signal), (list) => list.items),
    staleTime: THIRTY_SECONDS,
    gcTime: FIVE_MINUTES,
    placeholderData: keepPreviousData,
  });
}

type CollectionKey = ReturnType<typeof keys.catalog.list<{ collection: string }>>;

export function collectionNftsQuery(collectionId: string): TaggedQueryOptions<NftListResponse, CollectionKey> {
  return queryOptions({
    queryKey: keys.catalog.list({ collection: collectionId }),
    queryFn: ({ signal }) => seedNftVersions(() => getCollectionNfts(collectionId, signal), (list) => list.items),
    staleTime: ONE_MINUTE,
    gcTime: FIVE_MINUTES,
  });
}

export function featuredNftsQuery(): TaggedQueryOptions<NftSummary[], typeof keys.catalog.featured> {
  return queryOptions({
    queryKey: keys.catalog.featured,
    queryFn: ({ signal }) => seedNftVersions(() => getFeaturedNfts(signal), (list) => list),
    staleTime: ONE_MINUTE,
    gcTime: FIVE_MINUTES,
  });
}

export function nftQuery(nftId: string): TaggedQueryOptions<Nft, ReturnType<typeof keys.nft>> {
  return queryOptions({
    queryKey: keys.nft(nftId),
    queryFn: ({ signal }) => seedNftVersions(() => getNft(nftId, signal), (nft) => [nft]),
    staleTime: ONE_MINUTE,
    gcTime: FIVE_MINUTES,
  });
}

export async function ensureNft(queryClient: QueryClient, nftId: string): Promise<Nft | null> {
  try {
    return await ensureDespiteCancel(() => queryClient.ensureQueryData(nftQuery(nftId)));
  } catch (error) {
    if (error instanceof ApiError && error.info.code === "NOT_FOUND") return null;
    throw error;
  }
}

export function favoritesQuery(userId: string): TaggedQueryOptions<string[], FavoritesKey> {
  return queryOptions({
    queryKey: keys.priv(userId).favorites,
    queryFn: ({ signal }) => getFavorites(signal),
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES,
  });
}

export type ToggleFavoriteInput = { nftId: string; isFavorite: boolean };

type ToggleFavoriteContext = { isPreviouslyFavorite: boolean };

export function useToggleFavoriteMutation(
  userId: string,
): UseMutationResult<void, Error, ToggleFavoriteInput, ToggleFavoriteContext> {
  const queryClient = useQueryClient();
  const favoritesKey = favoritesQuery(userId).queryKey;
  const mutationKey = [...favoritesKey, "toggle"];

  return useMutation({
    mutationKey,
    mutationFn: ({ nftId, isFavorite }: ToggleFavoriteInput) =>
      isFavorite ? addFavorite(nftId) : removeFavorite(nftId),
    onMutate: async ({ nftId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: favoritesKey });
      const isPreviouslyFavorite = queryClient.getQueryData(favoritesKey)?.includes(nftId) ?? !isFavorite;
      queryClient.setQueryData(favoritesKey, (ids) => ids && toggleItem(ids, nftId, isFavorite));
      return { isPreviouslyFavorite };
    },
    onError: (_error, { nftId }, context) => {
      if (context) {
        queryClient.setQueryData(favoritesKey, (ids) => ids && toggleItem(ids, nftId, context.isPreviouslyFavorite));
      }
      announce("Não foi possível atualizar os favoritos. Tente de novo.", "assertive");
    },
    onSuccess: (_result, { isFavorite }) => {
      announce(isFavorite ? "NFT adicionado aos favoritos." : "NFT removido dos favoritos.");
    },
    onSettled: async (_result, _error, { nftId }) => {
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: favoritesKey }),
        queryClient.invalidateQueries({ queryKey: keys.nft(nftId) }),
      ]);
    },
  });
}
