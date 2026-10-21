import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useState, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { announce } from "@/lib/a11y/announcer";
import { ensureCartOwner } from "@/lib/session/instance";
import { useAddCartItemMutation } from "../queries";

type AddToCartButtonProps = { nftId: string; editionId: string; quantity: number };

export function AddToCartButton({ nftId, editionId, quantity }: AddToCartButtonProps): JSX.Element {
  const add = useAddCartItemMutation();
  const [isAdded, setIsAdded] = useState(false);

  function handleAdd(): void {
    setIsAdded(false);
    add.mutate(
      { owner: ensureCartOwner(), nftId, editionId, quantity },
      {
        onSuccess: () => {
          setIsAdded(true);
          announce(`${quantity} ${quantity === 1 ? "unidade adicionada" : "unidades adicionadas"} ao carrinho.`);
        },
      },
    );
  }

  return (
    <div className="contents">
      <Button type="button" disabled={add.isPending} aria-busy={add.isPending} onClick={handleAdd} className="h-10 text-sm max-md:h-15 max-md:flex-1 max-md:rounded-full max-md:bg-transparent max-md:bg-linear-to-r max-md:from-primary max-md:to-primary/80 max-md:text-base max-md:font-bold">
        <ShoppingCart aria-hidden="true" />
        Comprar
        <span className="sr-only"> (adiciona ao carrinho)</span>
      </Button>
      {add.isError && (
        <p role="alert" className="order-last w-0 min-w-full basis-full text-sm text-destructive">
          {add.error.message || "Não foi possível adicionar ao carrinho."}
        </p>
      )}
      {isAdded && (
        <p className="order-last w-0 min-w-full basis-full text-sm">
          Adicionado.{" "}
          <Link to="/cart" className="underline underline-offset-4">
            Ver carrinho
          </Link>
        </p>
      )}
    </div>
  );
}
