import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Minus, Plus } from "lucide-react";
import { useState, type FormEvent, type JSX } from "react";
import { TextField } from "@/components/form/TextField";
import { DeleteIcon } from "@/components/icons/KurioIcons";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Cart, CartItem, Quote } from "@/contracts/cart";
import { purchaseLimit } from "@/contracts/nft";
import { formatEth } from "@/lib/eth";
import { getApiFieldError } from "@/lib/forms";
import { NftRail } from "../../catalog/components/NftRail";
import { catalogListQuery } from "../../catalog/queries";
import { cn } from "@/lib/utils";
import { useNftSubscription } from "@/lib/realtime/instance";
import {
  cartQuery,
  quoteQuery,
  useApplyCouponMutation,
  useRemoveCartItemMutation,
  useRemoveCouponMutation,
  useUpdateQuantityMutation,
} from "../queries";
import { EmptyCart } from "./EmptyCart";

const QUANTITY_BUTTON = "h-7.5 w-5 rounded-full border border-ink p-0 shadow-md [&_svg:not([class*='size-'])]:size-3.5";
const ROW = "grid grid-cols-[auto_1fr] md:grid-cols-[minmax(0,1fr)_7.5rem_8rem_7.5rem_2.5rem]";

function itemLimit(item: CartItem): number {
  return purchaseLimit({ ...item, status: item.status === "sold_out" ? "sold_out" : "available" });
}

function ItemNotice({ item, quote }: { item: CartItem; quote: Quote | undefined }): JSX.Element | null {
  const priceChange = quote?.issues.find((issue) => issue.kind === "PRICE_CHANGED" && issue.itemId === item.id);
  const message = {
    ok: null,
    sold_out: "Esgotado: remova o item para continuar.",
    insufficient: `Só ${itemLimit(item) === 1 ? "resta 1 unidade" : `restam ${itemLimit(item)} unidades`} para este pedido. Ajuste a quantidade.`,
    price_changed:
      priceChange?.kind === "PRICE_CHANGED"
        ? `Preço alterado: de ${formatEth(priceChange.from)} para ${formatEth(priceChange.to)} ETH.`
        : "O preço desta edição mudou.",
  }[item.status];

  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-sm text-destructive">
      <AlertTriangle aria-hidden="true" className="size-4 shrink-0" />
      {message}
    </p>
  );
}

function CartLine({ owner, item, quote }: { owner: string; item: CartItem; quote: Quote | undefined }): JSX.Element {
  const update = useUpdateQuantityMutation(owner);
  const remove = useRemoveCartItemMutation(owner);
  const limit = itemLimit(item);
  const line = quote?.lines.find((candidate) => candidate.itemId === item.id);
  const isBlocked = item.status === "sold_out";

  return (
    <li className={cn(ROW, "relative items-center gap-x-4 gap-y-2 bg-surface-card p-0 pr-3")}>
      <div className="col-span-2 flex min-w-0 items-start gap-4 md:col-span-1">
        <img
          src={item.cover.url}
          alt={item.cover.alt}
          width={96}
          height={96}
          className="aspect-square w-24 shrink-0 rounded-md object-cover md:w-17.5"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1 py-2 pr-10 md:pr-0">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="truncate font-bold hover:text-text-accent">
            {item.nftName}
          </Link>
          <span className="truncate text-sm text-secondary-base">ID do token: {item.tokenId}</span>
          <span className="text-lg font-bold text-text-accent md:hidden">
            {formatEth(line?.unitPrice ?? item.unitPrice)} ETH
          </span>
          <ItemNotice item={item} quote={quote} />
          {item.status === "insufficient" && limit > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => update.mutate({ itemId: item.id, quantity: limit, nftName: item.nftName })}
            >
              Ajustar para {limit}
            </Button>
          )}
        </div>
      </div>
      <p className="hidden text-base font-bold text-text-secondary md:block">
        <span className="sr-only">Preço unitário: </span>
        {formatEth(line?.unitPrice ?? item.unitPrice)} ETH
      </p>
      <div className="flex items-center gap-2 pb-3 pl-3 md:p-0" role="group" aria-label={`Quantidade de ${item.nftName}`}>
        <Button
          type="button"
          className={QUANTITY_BUTTON}
          aria-label={`Diminuir quantidade de ${item.nftName}`}
          disabled={isBlocked || item.quantity <= 1}
          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity - 1, nftName: item.nftName })}
        >
          <Minus aria-hidden="true" />
        </Button>
        <span className="w-5 text-center text-md">{item.quantity}</span>
        <Button
          type="button"
          className={QUANTITY_BUTTON}
          aria-label={`Aumentar quantidade de ${item.nftName}`}
          disabled={isBlocked || item.quantity >= limit}
          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity + 1, nftName: item.nftName })}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <p className="pb-3 text-right text-base font-bold text-text-accent md:p-0 md:text-left">
        <span className="sr-only">Total da linha: </span>
        {line ? `${formatEth(line.lineTotal)} ETH` : "..."}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Remover ${item.nftName}`}
        disabled={remove.isPending}
        onClick={() => remove.mutate(item.id)}
        className="absolute top-2 right-2 text-secondary-base hover:text-text-accent md:static"
      >
        <DeleteIcon className="size-6" />
      </Button>
    </li>
  );
}

function CouponForm({ owner, cart, quote }: { owner: string; cart: Cart; quote: Quote | undefined }): JSX.Element {
  const apply = useApplyCouponMutation(owner);
  const remove = useRemoveCouponMutation(owner);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(undefined);
    if (!code.trim()) return setError("Informe o cupom.");
    try {
      await apply.mutateAsync(code);
      setCode("");
    } catch (cause) {
      setError(getApiFieldError(cause, "code") ?? "Não foi possível aplicar o cupom.");
    }
  }

  if (cart.coupon) {
    const issue = quote?.issues.find((candidate) => candidate.kind === "COUPON_EXPIRED" || candidate.kind === "COUPON_MINIMUM_NOT_MET");
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm">
          Cupom <strong className="text-text-accent">{cart.coupon.code}</strong> aplicado{quote?.coupon ? `: ${quote.coupon.description}` : "."}
        </p>
        {issue?.kind === "COUPON_EXPIRED" && <p className="text-sm text-destructive">Este cupom expirou e não dá mais desconto.</p>}
        {issue?.kind === "COUPON_MINIMUM_NOT_MET" && (
          <p className="text-sm text-destructive">
            O desconto volta quando o subtotal chegar a {formatEth(issue.minimum)} ETH.
          </p>
        )}
        <Button type="button" variant="outline" size="sm" className="self-start" disabled={remove.isPending} onClick={() => remove.mutate()}>
          Remover cupom
        </Button>
      </div>
    );
  }

  return (
    <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void handleSubmit(event)}>
      <div className="flex items-end">
        <div className="min-w-0 flex-1 [&_input]:rounded-r-none [&_input]:border-primary [&_label]:text-sm [&_label]:font-bold">
          <TextField
            label="Tem um código promocional?"
            autoComplete="off"
            placeholder="Digite o código promocional..."
            value={code}
            error={error}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          disabled={apply.isPending}
          aria-busy={apply.isPending}
          className={cn("rounded-l-none", error && "mb-7")}
        >
          Aplicar
        </Button>
      </div>
    </form>
  );
}

function Summary({ owner, cart }: { owner: string; cart: Cart }): JSX.Element {
  const quote = useQuery(quoteQuery(owner, cart.version));
  const isRefreshing = quote.isPlaceholderData || quote.isFetching;

  return (
    <section aria-labelledby="summary-title" aria-busy={isRefreshing} className="flex flex-col gap-5 bg-surface-card p-4 md:bg-transparent md:p-0">
      <h2 id="summary-title" className="border-b border-border-strong pb-3 text-lg font-bold">
        Resumo do pedido
      </h2>
      <CouponForm owner={owner} cart={cart} quote={quote.data} />
      {quote.isError && !quote.data ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p>Não foi possível calcular o resumo.</p>
          <Button variant="outline" size="sm" onClick={() => void quote.refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-3 text-base">
          <dt>Subtotal</dt>
          <dd className="text-right text-lg">{quote.data ? `${formatEth(quote.data.subtotal)} ETH` : "..."}</dd>
          <dt>Desconto</dt>
          <dd className="text-right">{quote.data ? `- ${formatEth(quote.data.discount)} ETH` : "..."}</dd>
          <dt>Taxa de rede</dt>
          <dd className="text-right text-lg">
            {quote.data ? `${formatEth(quote.data.networkFee)} ETH` : "..."}
            <span className="block text-xs text-text-accent">Taxa estimada</span>
          </dd>
          <dt className="mt-3 font-bold">Total</dt>
          <dd className="mt-3 text-right text-lg font-bold text-text-accent">
            {quote.data ? `${formatEth(quote.data.total)} ETH` : "..."}
          </dd>
        </dl>
      )}
      <p role="status" className="sr-only">
        {isRefreshing ? "Atualizando o resumo..." : ""}
      </p>
      <Link to="/checkout" className={cn(buttonVariants({ size: "lg" }), "w-full rounded-full md:h-10 md:rounded-md")}>
        Conectar e finalizar
      </Link>
      <Link to="/" className="self-center text-base text-text-accent hover:underline">
        Continuar explorando
      </Link>
    </section>
  );
}


function CartContent({ owner }: { owner: string }): JSX.Element {
  const cart = useQuery(cartQuery(owner));
  const quote = useQuery({ ...quoteQuery(owner, cart.data?.version ?? 0), enabled: false });
  useNftSubscription(cart.data?.items.map((item) => item.nftId) ?? []);

  if (cart.isPending) return <CartSkeleton />;
  if (cart.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Não foi possível carregar o carrinho.</p>
        <Button variant="outline" onClick={() => void cart.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (cart.data.items.length === 0) return <EmptyCart />;

  return (
    <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-21">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div aria-hidden="true" className={cn(ROW, "hidden border-b border-border-strong pb-3 font-bold md:grid")}>
          <span>NFTs</span>
          <span>Preço</span>
          <span>Edições</span>
          <span>Total</span>
        </div>
        <ul aria-label="Itens do carrinho" className="flex flex-col gap-3">
          {cart.data.items.map((item) => (
            <CartLine key={item.id} owner={owner} item={item} quote={quote.data} />
          ))}
        </ul>
      </div>
      <div className="md:ml-auto md:w-full md:max-w-md xl:w-83">
        <Summary owner={owner} cart={cart.data} />
      </div>
    </div>
  );
}

function AlsoViewedRail({ owner }: { owner: string | null }): JSX.Element | null {
  const popular = useQuery(catalogListQuery({ sort: "popular" }));
  const cart = useQuery({ ...cartQuery(owner ?? ""), enabled: owner !== null });
  const inCart = new Set(cart.data?.items.map((item) => item.nftId));
  if (popular.isError) return null;

  return (
    <NftRail
      title="Colecionadores também viram"
      listLabel="NFTs que colecionadores também viram"
      items={popular.data?.items.filter((nft) => !inCart.has(nft.id)) ?? []}
      isPending={popular.isPending}
    />
  );
}

function CartSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <p className="sr-only">Carregando o carrinho...</p>
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="skeleton h-24 w-full md:h-17.5" />
      ))}
    </div>
  );
}

export function CartPage({ owner }: { owner: string | null }): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-6 px-4 pt-6 lg:pt-8">
      <nav aria-label="Trilha" className="text-sm font-bold">
        <ol className="flex flex-wrap gap-1">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
            <span aria-hidden="true"> / </span>
          </li>
          <li>
            <Link to="/" hash="mercado" className="hover:text-text-accent">
              Mercado
            </Link>
            <span aria-hidden="true"> / </span>
          </li>
          <li aria-current="page" className="text-text-accent">
            Carrinho
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-bold md:sr-only">Carrinho de NFTs</h1>
      {owner ? <CartContent owner={owner} /> : <EmptyCart />}
      <div className="mt-6 lg:mt-10">
        <AlsoViewedRail owner={owner} />
      </div>
    </main>
  );
}
