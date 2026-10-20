import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent, type JSX } from "react";
import { TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import type { Cart, CartItem, Quote } from "@/contracts/cart";
import { formatEth } from "@/lib/eth";
import { getApiFieldError } from "@/lib/forms";
import {
  cartQuery,
  quoteQuery,
  useApplyCouponMutation,
  useRemoveCartItemMutation,
  useRemoveCouponMutation,
  useUpdateQuantityMutation,
} from "../queries";

type CartProps = { owner: string };

function itemLimit(item: CartItem): number {
  return Math.min(item.available, item.maxPerOrder);
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
    <p className="flex items-center gap-1 text-sm font-medium text-destructive">
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
    <li className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center">
      <img src={item.cover.url} alt={item.cover.alt} width={64} height={64} className="size-16 rounded-lg object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="font-medium underline-offset-4 hover:underline">
          {item.nftName}
        </Link>
        <span className="text-sm text-muted-foreground">
          Edição {item.editionLabel} · {formatEth(item.unitPrice)} ETH cada
        </span>
        <ItemNotice item={item} quote={quote} />
      </div>
      <div className="flex items-center gap-2" role="group" aria-label={`Quantidade de ${item.nftName}`}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Diminuir quantidade de ${item.nftName}`}
          disabled={isBlocked || item.quantity <= 1}
          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
        >
          <Minus aria-hidden="true" />
        </Button>
        <output aria-live="polite" className="w-8 text-center">
          {item.quantity}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Aumentar quantidade de ${item.nftName}`}
          disabled={isBlocked || item.quantity >= limit}
          onClick={() => update.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <p className="w-32 text-sm font-medium sm:text-right">
        <span className="sr-only">Total da linha: </span>
        {line ? `${formatEth(line.lineTotal)} ETH` : "..."}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remover ${item.nftName}`}
        disabled={remove.isPending}
        onClick={() => remove.mutate(item.id)}
      >
        <Trash2 aria-hidden="true" />
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
          Cupom <strong>{cart.coupon.code}</strong> aplicado{quote?.coupon ? `: ${quote.coupon.description}` : "."}
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
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label="Tem um código promocional?"
            autoComplete="off"
            placeholder="Digite o código promocional"
            value={code}
            error={error}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={apply.isPending} aria-busy={apply.isPending} className={error ? "mb-7" : undefined}>
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
    <section aria-labelledby="summary-title" aria-busy={isRefreshing} className="flex flex-col gap-4 rounded-xl border p-4">
      <h2 id="summary-title" className="text-lg font-semibold">
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
        <dl className="grid grid-cols-[1fr_auto] gap-y-2 text-sm">
          <dt>Subtotal</dt>
          <dd className="text-right">{quote.data ? `${formatEth(quote.data.subtotal)} ETH` : "..."}</dd>
          <dt>Desconto</dt>
          <dd className="text-right">{quote.data ? `- ${formatEth(quote.data.discount)} ETH` : "..."}</dd>
          <dt>
            Taxa de rede <span className="text-muted-foreground">(Ethereum, estimada)</span>
          </dt>
          <dd className="text-right">{quote.data ? `${formatEth(quote.data.networkFee)} ETH` : "..."}</dd>
          <dt className="text-base font-semibold">Total</dt>
          <dd className="text-right text-base font-semibold">{quote.data ? `${formatEth(quote.data.total)} ETH` : "..."}</dd>
        </dl>
      )}
      <p role="status" className="text-xs text-muted-foreground">
        {isRefreshing ? "Atualizando o resumo..." : "Valores calculados pelo servidor."}
      </p>
      <Link to="/" className="text-sm underline underline-offset-4">
        Continuar explorando
      </Link>
    </section>
  );
}

export function CartPage({ owner }: CartProps): JSX.Element {
  const cart = useQuery(cartQuery(owner));
  const quote = useQuery({ ...quoteQuery(owner, cart.data?.version ?? 0), enabled: false });

  let content: JSX.Element;
  if (cart.isPending) {
    content = <p>Carregando o carrinho...</p>;
  } else if (cart.isError) {
    content = (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Não foi possível carregar o carrinho.</p>
        <Button variant="outline" onClick={() => void cart.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  } else if (cart.data.items.length === 0) {
    content = (
      <div className="flex flex-col items-start gap-2">
        <p>Seu carrinho está vazio.</p>
        <Link to="/" className="underline underline-offset-4">
          Explorar o catálogo
        </Link>
      </div>
    );
  } else {
    content = (
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <ul aria-label="Itens do carrinho" className="flex min-w-0 flex-1 flex-col gap-3">
          {cart.data.items.map((item) => (
            <CartLine key={item.id} owner={owner} item={item} quote={quote.data} />
          ))}
        </ul>
        <div className="lg:w-96">
          <Summary owner={owner} cart={cart.data} />
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      <nav aria-label="Trilha" className="text-sm">
        <Link to="/" className="underline underline-offset-4">
          Início
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">Carrinho</span>
      </nav>
      <h1 className="text-2xl font-semibold md:text-3xl">Carrinho</h1>
      {content}
    </main>
  );
}
