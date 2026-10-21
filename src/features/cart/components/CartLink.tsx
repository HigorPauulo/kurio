import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ComponentType, JSX, SVGProps } from "react";
import { CartIcon } from "@/components/icons/KurioIcons";
import { useCartOwner } from "@/lib/session/instance";
import { cartQuery } from "../queries";

type CartLinkProps = { className?: string; icon?: ComponentType<SVGProps<SVGSVGElement>> };

export function CartLink({ className, icon: Icon = CartIcon }: CartLinkProps): JSX.Element {
  const owner = useCartOwner();
  const cart = useQuery({ ...cartQuery(owner ?? ""), enabled: owner !== null });
  const count = cart.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0;
  const label = count === 0 ? "Carrinho vazio" : `Carrinho, ${count} ${count === 1 ? "item" : "itens"}`;

  return (
    <Link
      to="/cart"
      aria-label={label}
      className={cn("relative inline-flex size-10 items-center justify-center rounded-md hover:text-text-accent", className)}
    >
      <Icon className="size-6" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute top-1 right-0 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-background bg-primary px-0.5 text-2xs leading-none font-medium text-primary-foreground"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
