import { createFileRoute } from "@tanstack/react-router";
import { CartPage } from "@/features/cart/components/CartPage";
import { cartQuery } from "@/features/cart/queries";
import { getCartOwner, useCartOwner } from "@/lib/session/instance";

export const Route = createFileRoute("/cart")({
  loader: ({ context }) => {
    void context.queryClient.prefetchQuery(cartQuery(getCartOwner()));
  },
  component: CartRoute,
});

function CartRoute() {
  const owner = useCartOwner();
  return <CartPage key={owner} owner={owner} />;
}
