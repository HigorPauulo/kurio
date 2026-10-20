import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { JSX } from "react";
import type { Chain } from "@/contracts/common";
import type { Order } from "@/contracts/order";
import { formatEth } from "@/lib/eth";
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

function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

function Receipt({ order }: { order: Order }): JSX.Element {
  const { receipt, transaction } = order;
  return (
    <section aria-labelledby="receipt-title" className="flex max-w-2xl flex-col gap-4">
      <h2 id="receipt-title" className="text-lg font-semibold">
        Detalhes da transação
      </h2>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">ID da transação</dt>
          <dd title={transaction?.hash}>{transaction ? shortHash(transaction.hash) : "-"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Data</dt>
          <dd>{DATE_FORMAT.format(new Date(order.updatedAt))}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Total</dt>
          <dd>{formatEth(receipt.total)} ETH</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Carteira</dt>
          <dd>{PROVIDER_LABELS[receipt.wallet.provider]}</dd>
        </div>
      </dl>
      <ul aria-label="NFTs comprados" className="flex flex-col gap-2">
        {receipt.lines.map((line) => (
          <li key={line.itemId} className="flex items-center gap-3 text-sm">
            <img src={line.cover.url} alt={line.cover.alt} width={48} height={48} className="size-12 rounded-lg object-cover" />
            <span className="flex-1">
              {line.nftName} ({line.editionLabel}) × {line.quantity}
            </span>
            <span>{formatEth(line.lineTotal)} ETH</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
        {receipt.coupon && (
          <>
            <dt>Desconto ({receipt.coupon.code})</dt>
            <dd className="text-right">- {formatEth(receipt.discount)} ETH</dd>
          </>
        )}
        <dt>Taxa de rede</dt>
        <dd className="text-right">{formatEth(receipt.networkFee)} ETH</dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right font-semibold">{formatEth(receipt.total)} ETH</dd>
      </dl>
      <p className="text-sm">
        Transação confirmada na {CHAIN_LABELS[receipt.network]}. A propriedade foi registrada na carteira {receipt.wallet.label}.
      </p>
      {transaction && (
        <a href={transaction.explorerUrl} target="_blank" rel="noreferrer" className="self-start underline underline-offset-4">
          Ver no {EXPLORER_LABELS[receipt.network]} (simulado)
        </a>
      )}
    </section>
  );
}

export function OrderPage({ userId, orderId }: { userId: string; orderId: string }): JSX.Element {
  const isConnected = useRealtimeConnected();
  const order = useQuery({
    ...orderQuery(userId, orderId),
    refetchInterval: (query) => (query.state.data?.status === "pending" && !isConnected ? ORDER_POLL_MS : false),
  });
  useOrderSubscription(order.data?.status === "pending" ? orderId : null);

  if (!order.data) return <main className="p-6">Carregando o pedido...</main>;
  const { status, receipt, refusal } = order.data;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-4 md:p-6">
      {status === "pending" && (
        <>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Clock aria-hidden="true" className="size-6" />
            Pedido em processamento
          </h1>
          <p role="status">Aguardando a confirmação da rede {CHAIN_LABELS[receipt.network]}. Esta página se atualiza sozinha.</p>
          <p className="text-sm">Total: {formatEth(receipt.total)} ETH</p>
        </>
      )}
      {status === "confirmed" && (
        <>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <CheckCircle2 aria-hidden="true" className="size-6" />
            Seus NFTs agora estão na sua carteira
          </h1>
          <Receipt order={order.data} />
        </>
      )}
      {status === "refused" && (
        <>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <XCircle aria-hidden="true" className="size-6" />
            Pagamento recusado
          </h1>
          <p role="alert">{refusal?.reason}</p>
          <p>Seu carrinho foi preservado.</p>
          <Link to="/cart" className="self-start underline underline-offset-4">
            Voltar ao carrinho
          </Link>
        </>
      )}
    </main>
  );
}
