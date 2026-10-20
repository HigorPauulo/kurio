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
import type { Cart, Quote } from "@/contracts/cart";
import type { Chain } from "@/contracts/common";
import { announce } from "@/lib/a11y/announcer";
import { keys } from "@/lib/query/keys";
import {
  addCartItem,
  applyCoupon,
  createQuote,
  getCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
  type AddCartItemInput,
} from "./api";

const ONE_MINUTE = 60_000;
const MIN_QUOTE_REFRESH_MS = 1_000;

function msUntilExpiry(quote: Quote | undefined): number {
  return quote ? Math.max(Date.parse(quote.expiresAt) - Date.now(), 0) : 0;
}

export const CART_NETWORK: Chain = "ethereum";

type TaggedQueryOptions<TData, TKey extends readonly unknown[]> = UseQueryOptions<TData, Error, TData, TKey> & {
  queryKey: DataTag<TKey, TData, Error>;
};

type CartKey = ReturnType<typeof keys.priv>["cart"];
type QuoteKey = ReturnType<ReturnType<typeof keys.priv>["quote"]>;

export function cartQuery(owner: string): TaggedQueryOptions<Cart, CartKey> {
  return queryOptions({
    queryKey: keys.priv(owner).cart,
    queryFn: ({ signal }) => getCart(signal),
    staleTime: 0,
    gcTime: ONE_MINUTE,
  });
}

export function quoteQuery(owner: string, cartVersion: number, network: Chain = CART_NETWORK): TaggedQueryOptions<Quote, QuoteKey> {
  return queryOptions({
    queryKey: keys.priv(owner).quote(network, cartVersion),
    queryFn: ({ signal }) => createQuote(network, signal),
    staleTime: (query) => msUntilExpiry(query.state.data),
    refetchInterval: (query) => (query.state.data ? Math.max(msUntilExpiry(query.state.data), MIN_QUOTE_REFRESH_MS) : false),
    refetchOnWindowFocus: false,
    gcTime: ONE_MINUTE,
    placeholderData: keepPreviousData,
  });
}

function storeCart(queryClient: QueryClient, owner: string, cart: Cart): void {
  queryClient.setQueryData(cartQuery(owner).queryKey, cart);
}

export type AddToCartInput = AddCartItemInput & { owner: string };

export function useAddCartItemMutation(): UseMutationResult<Cart, Error, AddToCartInput> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ nftId, editionId, quantity }: AddToCartInput) => addCartItem({ nftId, editionId, quantity }),
    onSuccess: (cart, { owner }) => storeCart(queryClient, owner, cart),
  });
}

export type UpdateQuantityInput = { itemId: string; quantity: number; nftName: string };

type UpdateQuantityContext = { previousQuantity: number | undefined };

function withQuantity(cart: Cart | undefined, itemId: string, quantity: number | undefined): Cart | undefined {
  if (!cart || quantity === undefined) return cart;
  return { ...cart, items: cart.items.map((item) => (item.id === itemId ? { ...item, quantity } : item)) };
}

export function useUpdateQuantityMutation(
  owner: string,
): UseMutationResult<Cart, Error, UpdateQuantityInput, UpdateQuantityContext> {
  const queryClient = useQueryClient();
  const cartKey = cartQuery(owner).queryKey;
  const mutationKey = [...cartKey, "quantity"];

  return useMutation({
    mutationKey,
    mutationFn: ({ itemId, quantity }: UpdateQuantityInput) => updateCartItem(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previousQuantity = queryClient.getQueryData(cartKey)?.items.find((item) => item.id === itemId)?.quantity;
      queryClient.setQueryData(cartKey, (cart) => withQuantity(cart, itemId, quantity));
      return { previousQuantity };
    },
    onError: (error, { itemId }, context) => {
      queryClient.setQueryData(cartKey, (cart) => withQuantity(cart, itemId, context?.previousQuantity));
      announce(error.message || "Não foi possível alterar a quantidade.", "assertive");
    },
    onSuccess: (cart, { nftName, quantity }) => {
      announce(`Quantidade de ${nftName}: ${quantity}.`);
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      storeCart(queryClient, owner, cart);
    },
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      await queryClient.invalidateQueries({ queryKey: cartKey });
    },
  });
}

export function useRemoveCartItemMutation(owner: string): UseMutationResult<Cart, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeCartItem,
    onSuccess: (cart) => {
      announce("Item removido do carrinho.");
      storeCart(queryClient, owner, cart);
    },
    onError: () => announce("Não foi possível remover o item.", "assertive"),
  });
}

export function useApplyCouponMutation(owner: string): UseMutationResult<Cart, Error, string> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: applyCoupon,
    onSuccess: (cart) => storeCart(queryClient, owner, cart),
  });
}

export function useRemoveCouponMutation(owner: string): UseMutationResult<Cart, Error, void> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeCoupon,
    onSuccess: (cart) => storeCart(queryClient, owner, cart),
  });
}
