import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Clock, X, XCircle } from "lucide-react";
import type { JSX } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { Chain } from "@/contracts/common";
import type { Order } from "@/contracts/order";
import { formatEth } from "@/lib/eth";
import { cn } from "@/lib/utils";
import { useOrderSubscription, useRealtimeConnected } from "@/lib/realtime/instance";
import { CHAIN_LABELS } from "../../catalog/labels";
import { ORDER_POLL_MS, orderQuery } from "../queries";
import { PROVIDER_LABELS } from "../labels";

const EXPLORER_LABELS: Record<Chain, string> = {
  ethereum: "Etherscan",
  polygon: "Polygonscan",
  base: "Basescan",
};

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function formatReceiptDate(value: string): string {
  const parts = DATE_FORMAT.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value ?? "";
  const month = part("month").replace(".", "");
  return `${part("day")} ${month.charAt(0).toUpperCase()}${month.slice(1)}, ${part("year")}`;
}

function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

const CARD = "relative mx-auto flex w-full max-w-145 flex-col border-b-10 border-primary bg-surface-card";
const SCREEN = "flex min-h-dvh w-full items-center justify-center px-4 py-10";

function CloseButton(): JSX.Element {
  return (
    <Link
      to="/"
      aria-label="Fechar e voltar ao início"
      className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-text-accent hover:bg-surface-raised"
    >
      <X aria-hidden="true" className="size-5" />
    </Link>
  );
}

function Receipt({ order }: { order: Order }): JSX.Element {
  const { receipt, transaction } = order;
  return (
    <>
      <dl className="grid grid-cols-2 gap-4 border-y border-primary px-6 py-4 whitespace-nowrap text-text-secondary sm:flex sm:justify-between sm:gap-0 sm:px-8">
        <div className="sm:border-r sm:border-primary sm:pr-4">
          <dt className="text-sm font-bold">ID da transação</dt>
          <dd title={transaction?.hash} className="text-body">
            {transaction ? shortHash(transaction.hash) : "-"}
          </dd>
        </div>
        <div className="sm:border-r sm:border-primary sm:px-4">
          <dt className="text-sm">Data</dt>
          <dd className="text-body">{formatReceiptDate(order.updatedAt)}</dd>
        </div>
        <div className="sm:border-r sm:border-primary sm:px-4">
          <dt className="text-sm">Total</dt>
          <dd className="text-body">{formatEth(receipt.total)} ETH</dd>
        </div>
        <div className="sm:pl-4">
          <dt className="text-sm font-bold">Carteira</dt>
          <dd className="text-body">{PROVIDER_LABELS[receipt.wallet.provider]}</dd>
        </div>
      </dl>
      <section aria-labelledby="receipt-title" className="flex flex-col gap-3 px-6 pt-5 pb-12 sm:px-11">
        <h2 id="receipt-title" className="text-body font-bold">
          Detalhes da transação
        </h2>
        <div aria-hidden="true" className="flex justify-between border-b border-border-strong pb-3 font-bold">
          <span>NFTs</span>
          <span className="hidden gap-12 sm:flex">
            <span>Edições</span>
            <span className="font-medium">Subtotal</span>
          </span>
        </div>
        <ul aria-label="NFTs comprados" className="flex flex-col gap-3">
          {receipt.lines.map((line) => (
            <li key={line.itemId} className="flex items-center gap-3">
              <img src={line.cover.url} alt={line.cover.alt} width={70} height={70} className="size-14 shrink-0 rounded-lg object-cover sm:size-17.5" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate font-bold">{line.nftName}</span>
                <span className="truncate text-sm text-secondary-base">ID do token: {line.tokenId}</span>
                <span className="flex items-baseline gap-3 whitespace-nowrap sm:hidden">
                  <span className="text-xs text-text-secondary">(x {line.quantity})</span>
                  <span className="text-base font-bold text-text-accent">{formatEth(line.lineTotal)} ETH</span>
                </span>
              </span>
              <span className="hidden text-sm whitespace-nowrap text-text-secondary sm:inline">(x {line.quantity})</span>
              <span className="hidden text-right text-lg font-bold whitespace-nowrap text-text-accent sm:inline sm:w-28">
                {formatEth(line.lineTotal)} ETH
              </span>
            </li>
          ))}
        </ul>
        <dl className="ml-auto grid w-full max-w-80 grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-3 border-b border-border-strong pb-3">
          {receipt.coupon && (
            <>
              <dt className="text-body">Desconto ({receipt.coupon.code})</dt>
              <dd className="text-right text-lg">- {formatEth(receipt.discount)} ETH</dd>
            </>
          )}
          <dt className="text-body">Taxa de rede</dt>
          <dd className="text-right text-lg">{formatEth(receipt.networkFee)} ETH</dd>
          <dt className="font-bold">Total</dt>
          <dd className="text-right text-lg font-bold text-text-accent">{formatEth(receipt.total)} ETH</dd>
        </dl>
        <p className="mt-2 text-center text-sm leading-[1.375rem] text-text-secondary">
          Transação confirmada na {CHAIN_LABELS[receipt.network]}. A propriedade foi registrada na carteira {receipt.wallet.label}.
        </p>
        {transaction && (
          <a
            href={transaction.explorerUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "lg" }), "mt-4 self-center")}
          >
            Ver no {EXPLORER_LABELS[receipt.network]} (simulado)
          </a>
        )}
      </section>
    </>
  );
}

function StatusHeader({ icon, title }: { icon: JSX.Element; title: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
      {icon}
      <h1 className="text-base leading-5 font-bold text-text-secondary">{title}</h1>
    </div>
  );
}

export function OrderPage({ userId, orderId }: { userId: string; orderId: string }): JSX.Element {
  const isConnected = useRealtimeConnected();
  const order = useQuery({
    ...orderQuery(userId, orderId),
    refetchInterval: (query) => (query.state.data?.status === "pending" && !isConnected ? ORDER_POLL_MS : false),
  });
  useOrderSubscription(order.data?.status === "pending" ? orderId : null);

  if (!order.data) {
    return (
      <main aria-busy="true" className={SCREEN}>
        <p className="sr-only">Carregando o pedido...</p>
        <div className={cn(CARD, "skeleton h-96")} />
      </main>
    );
  }
  const { status, receipt, refusal } = order.data;

  return (
    <main className={SCREEN}>
      <div className={CARD}>
        <CloseButton />
        {status === "pending" && (
          <>
            <StatusHeader icon={<Clock aria-hidden="true" className="size-16 text-primary motion-safe:animate-pulse" />} title="Pedido em processamento" />
            <div className="flex flex-col items-center gap-3 border-t border-primary px-6 pt-5 pb-10 text-center text-sm">
              <p role="status" className="text-text-secondary">
                Aguardando a confirmação da rede {CHAIN_LABELS[receipt.network]}. Esta página se atualiza sozinha.
              </p>
              <p className="text-lg font-bold text-text-accent">Total: {formatEth(receipt.total)} ETH</p>
            </div>
          </>
        )}
        {status === "confirmed" && (
          <>
            <StatusHeader
              icon={<img src="/images/icons/thank-you.svg" alt="" width={65} height={80} className="h-20 w-auto" />}
              title="Seus NFTs agora estão na sua carteira"
            />
            <Receipt order={order.data} />
          </>
        )}
        {status === "refused" && (
          <>
            <StatusHeader icon={<XCircle aria-hidden="true" className="size-16 text-destructive" />} title="Pagamento recusado" />
            <div className="flex flex-col items-center gap-4 border-t border-primary px-6 pt-5 pb-10 text-center">
              <p role="alert" className="text-destructive">
                {refusal?.reason}
              </p>
              <p className="text-sm text-text-secondary">Seu carrinho foi preservado.</p>
              <Link to="/cart" className={buttonVariants()}>
                Voltar ao carrinho
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
