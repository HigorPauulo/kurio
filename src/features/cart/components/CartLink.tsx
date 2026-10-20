import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import type { JSX } from "react";
import { useCartOwner } from "@/lib/session/instance";
import { cartQuery } from "../queries";

export function CartLink(): JSX.Element {
  const owner = useCartOwner();
  const cart = useQuery({ ...cartQuery(owner ?? ""), enabled: owner !== null });
  const count = cart.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const label = count === 0 ? "Carrinho vazio" : `Carrinho, ${count} ${count === 1 ? "item" : "itens"}`;

  return (
    <Link to="/cart" aria-label={label} className="relative flex items-center gap-1">
      <ShoppingCart aria-hidden="true" className="size-5" />
      {count > 0 && (
        <span aria-hidden="true" className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
