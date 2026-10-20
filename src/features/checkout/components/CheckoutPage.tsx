import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type JSX } from "react";
import { FormError, TextField } from "@/components/form/TextField";
import { Button, buttonVariants } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Cart, Quote } from "@/contracts/cart";
import type { Chain } from "@/contracts/common";
import type { User } from "@/contracts/user";
import { walletProviderSchema, type Wallet } from "@/contracts/wallet";
import { formatEth } from "@/lib/eth";
import { getApiFieldError } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { keys } from "@/lib/query/keys";
import { useNftSubscription } from "@/lib/realtime/instance";
import { meQuery, useConnectWalletMutation, walletsQuery } from "../../account/queries";
import { cartQuery } from "../../cart/queries";
import { CHAIN_LABELS } from "../../catalog/labels";
import { PROVIDER_LABELS } from "../labels";
import { checkoutQuoteQuery, submitAttempt } from "../queries";
import { readAttempt, readDraft, saveAttempt, saveDraft, type CheckoutAttempt, type CheckoutDraft } from "../storage";

export type CheckoutStep = "details" | "review";

type CheckoutPageProps = {
  userId: string;
  step: CheckoutStep;
  onStepChange: (step: CheckoutStep) => void;
  onOrderPlaced: (orderId: string) => void;
};

type FieldErrors = Partial<Record<"ensName" | "wallet" | "network" | "note" | "connection" | "form", string>>;

type Phase = { kind: "idle" } | { kind: "submitting" } | { kind: "retry"; message: string };

const NOTE_MAX = 500;
const DRAFT_DEBOUNCE_MS = 500;

function pickNetwork(wallet: Wallet | undefined, preferred: Chain | undefined): Chain | undefined {
  if (!wallet) return undefined;
  if (preferred && wallet.networks.includes(preferred)) return preferred;
  if (wallet.connection.status === "connected" && wallet.networks.includes(wallet.connection.network)) {
    return wallet.connection.network;
  }
  return wallet.networks[0];
}

type WalletChoice = { secondary: Wallet | undefined; wallet: Wallet | undefined; network: Chain | undefined };

function selectWallet(wallets: Wallet[], draft: CheckoutDraft): WalletChoice {
  const primary = wallets.find((candidate) => candidate.role === "primary");
  const secondary = wallets.find((candidate) => candidate.role === "secondary");
  const wallet = draft.isSecondaryWallet && secondary ? secondary : primary;
  return { secondary, wallet, network: pickNetwork(wallet, draft.network) };
}

function moneySignature(quote: Quote): string {
  const lines = quote.lines.map((line) => [line.itemId, line.quantity, line.unitPrice, line.lineTotal]);
  return JSON.stringify([lines, quote.coupon?.code, quote.subtotal, quote.discount, quote.networkFee, quote.total]);
}

function isConnectedOn(wallet: Wallet | undefined, network: Chain | undefined): boolean {
  return wallet?.connection.status === "connected" && wallet.connection.network === network;
}

function serverFieldErrors(error: unknown): FieldErrors {
  const errors: FieldErrors = {
    ensName: getApiFieldError(error, "ensName"),
    wallet: getApiFieldError(error, "walletId"),
    network: getApiFieldError(error, "network"),
    note: getApiFieldError(error, "note"),
  };
  if (hasErrors(errors)) return errors;
  const message = error instanceof Error && error.message ? error.message : "";
  return { form: `Não foi possível enviar o pedido. ${message}`.trim() };
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

function useCheckoutDraft(userId: string): [CheckoutDraft, (patch: Partial<CheckoutDraft>) => void] {
  const [draft, setDraft] = useState(() => readDraft(userId));

  useEffect(() => {
    const timer = setTimeout(() => saveDraft(userId, draft), DRAFT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [userId, draft]);

  return [draft, (patch) => setDraft((current) => ({ ...current, ...patch }))];
}

type ConnectionProps = { userId: string; wallet: Wallet | undefined; network: Chain | undefined; error: string | undefined };

function WalletConnection({ userId, wallet, network, error }: ConnectionProps): JSX.Element {
  const connect = useConnectWalletMutation(userId);
  const isConnected = isConnectedOn(wallet, network);

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? "connection-error" : undefined}>
      <legend className="mb-3 w-full text-center text-lg font-bold">Carteira e rede</legend>
      {walletProviderSchema.options.map((provider) => {
        const isChosen = wallet?.provider === provider;
        return (
          <div
            key={provider}
            className={cn(
              "flex min-h-11 flex-wrap items-center justify-between gap-2 border px-4 py-2 text-sm",
              isChosen ? "border-foreground bg-surface-card" : "border-border-strong",
            )}
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "size-4 rounded-full border border-primary",
                  isChosen && "border-4 border-surface-card bg-primary ring-1 ring-primary",
                )}
              />
              {PROVIDER_LABELS[provider]}
            </span>
            {!isChosen && (
              <span className="text-xs text-secondary-base">
                {wallet ? `A carteira escolhida é ${PROVIDER_LABELS[wallet.provider]}.` : "Cadastre uma carteira."}
              </span>
            )}
            {isChosen && isConnected && network && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 aria-hidden="true" className="size-4" />
                Conectada na {CHAIN_LABELS[network]}
              </span>
            )}
            {isChosen && !isConnected && wallet && network && (
              <Button
                type="button"
                size="sm"
                disabled={connect.isPending}
                aria-busy={connect.isPending}
                onClick={() => connect.mutate({ walletId: wallet.id, network })}
              >
                Conectar {PROVIDER_LABELS[provider]} na {CHAIN_LABELS[network]}
              </Button>
            )}
          </div>
        );
      })}
      {connect.isError && <FormError message={connect.error.message || "Não foi possível conectar a carteira."} />}
      {error && (
        <p id="connection-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}

type DetailsProps = {
  userId: string;
  user: User;
  cart: Cart;
  choice: WalletChoice;
  draft: CheckoutDraft;
  onDraftChange: (patch: Partial<CheckoutDraft>) => void;
  errors: FieldErrors;
  onErrorsChange: (errors: FieldErrors) => void;
  onReview: () => void;
};

function DetailsStep({ userId, user, cart, choice, draft, onDraftChange, errors, onErrorsChange, onReview }: DetailsProps): JSX.Element {
  const { secondary, wallet, network } = choice;
  const setErrors = onErrorsChange;
  const noteId = useId();

  function handleReview(): void {
    const next: FieldErrors = {
      ensName: user.ensName ? undefined : "Complete o Nome ENS no perfil para comprar.",
      wallet: wallet ? undefined : "Cadastre uma carteira para comprar.",
      note: draft.note.trim().length > NOTE_MAX ? `Use no máximo ${NOTE_MAX} caracteres.` : undefined,
      connection: wallet && !isConnectedOn(wallet, network) ? "Conecte a carteira na rede escolhida para continuar." : undefined,
    };
    setErrors(next);
    if (hasErrors(next)) return;
    onDraftChange({ network });
    onReview();
  }

  const walletLink = { to: "/account/wallets", label: "Editar em Carteiras" } as const;
  const profileLink = { to: "/account/profile", label: "Editar no Perfil" } as const;

  return (
    <form
      noValidate
      aria-labelledby="buyer-title"
      className="grid gap-10 lg:grid-cols-[1fr_25.3rem] lg:gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        handleReview();
      }}
    >
      <div className="flex min-w-0 flex-col gap-5">
        <h2 id="buyer-title" className="text-lg font-bold">
          Perfil do colecionador
        </h2>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <TextField label="Nome de exibição" value={user.name} readOnly required editIn={profileLink} />
          <TextField label="Nome de usuário" value={user.username} readOnly required editIn={profileLink} />
          <div className="flex flex-col gap-2">
            <label htmlFor="checkout-network" className="flex items-center gap-1 text-body leading-4">
              Rede
              <span aria-hidden="true" className="text-lg leading-none text-destructive">
                *
              </span>
            </label>
            <NativeSelect
              id="checkout-network"
              value={network ?? ""}
              disabled={!wallet}
              required
              aria-invalid={errors.network ? true : undefined}
              aria-describedby={errors.network ? "network-error" : undefined}
              onChange={(event) => onDraftChange({ network: event.target.value as Chain })}
            >
              {(wallet?.networks ?? []).map((option) => (
                <option key={option} value={option}>
                  {CHAIN_LABELS[option]}
                </option>
              ))}
            </NativeSelect>
            {errors.network && (
              <p id="network-error" className="text-sm text-destructive">
                {errors.network}
              </p>
            )}
          </div>
          <TextField label="Nome do perfil" value={wallet?.profileName ?? ""} readOnly required editIn={walletLink} />
          <TextField label="Endereço da carteira" value={wallet?.address ?? ""} readOnly required editIn={walletLink} error={errors.wallet} />
          <TextField label="ENS ou carteira secundária (opcional)" value={wallet?.backupAddress ?? ""} readOnly editIn={walletLink} />
          <TextField
            label="Tipo de carteira"
            value={wallet ? PROVIDER_LABELS[wallet.provider] : ""}
            readOnly
            required
            editIn={walletLink}
          />
          <TextField label="Código de indicação" value={wallet?.referralCode ?? ""} readOnly required editIn={walletLink} />
          <TextField label="E-mail" value={user.email} readOnly required editIn={profileLink} />
          <TextField label="Nome ENS" value={user.ensName ?? ""} readOnly required editIn={profileLink} error={errors.ensName} />
        </div>
        <label className="flex items-center gap-2 self-start text-body">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={draft.isSecondaryWallet && Boolean(secondary)}
            disabled={!secondary}
            aria-describedby={secondary ? undefined : "secondary-reason"}
            onChange={(event) => onDraftChange({ isSecondaryWallet: event.target.checked, network: undefined })}
          />
          Usar outra carteira?
        </label>
        {!secondary && (
          <p id="secondary-reason" className="-mt-3 text-xs text-secondary-base">
            Você não tem carteira secundária.{" "}
            <Link to="/account/wallets" className="text-text-accent underline underline-offset-4">
              Adicionar em Carteiras
            </Link>
          </p>
        )}
        <div className="flex flex-col gap-2 sm:max-w-88">
          <label htmlFor={noteId} className="text-body">
            Observação do colecionador (opcional)
          </label>
          <textarea
            id={noteId}
            rows={6}
            value={draft.note}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={errors.note ? `${noteId}-error` : undefined}
            className="rounded-md border border-input bg-transparent p-3 text-sm outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 aria-invalid:border-destructive"
            onChange={(event) => onDraftChange({ note: event.target.value })}
          />
          {errors.note && (
            <p id={`${noteId}-error`} className="text-sm text-destructive">
              {errors.note}
            </p>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby="items-title" className="flex flex-col gap-3">
          <h2 id="items-title" className="text-lg font-bold">
            Seus NFTs
          </h2>
          <ul className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 bg-surface-card pr-4">
                <img src={item.cover.url} alt="" width={70} height={70} className="aspect-square w-17.5 shrink-0 object-cover" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-bold">{item.nftName}</span>
                  <span className="text-sm text-secondary-base">Edição: {item.editionLabel}</span>
                </span>
                <span className="text-sm text-text-secondary">(x {item.quantity})</span>
              </li>
            ))}
          </ul>
          <p className="text-center text-sm">
            {cart.coupon ? `Cupom ${cart.coupon.code} aplicado.` : "Tem um código promocional?"}{" "}
            <Link to="/cart" className="text-text-accent underline underline-offset-4">
              {cart.coupon ? "Editar no carrinho" : "Aplique no carrinho"}
            </Link>
          </p>
          <p className="text-center text-xs text-text-accent">
            O resumo com taxa e total aparece na revisão, cotado na rede escolhida.
          </p>
        </section>
        <WalletConnection
          userId={userId}
          wallet={wallet}
          network={network}
          error={isConnectedOn(wallet, network) ? undefined : errors.connection}
        />
        {errors.form ? <FormError message={errors.form} /> : hasErrors(errors) && <FormError message="Corrija os campos indicados para continuar." />}
        <Button type="submit" size="lg" className="w-full rounded-full md:rounded-md">
          Revisar pedido
        </Button>
      </div>
    </form>
  );
}

function QuoteChanges({ accepted, current, cart }: { accepted: Quote; current: Quote; cart: Cart }): JSX.Element {
  const changed = current.lines.filter((line) => {
    const before = accepted.lines.find((candidate) => candidate.itemId === line.itemId);
    return before && before.unitPrice !== line.unitPrice;
  });

  return (
    <div role="alert" className="flex flex-col gap-1 rounded-md border border-destructive p-4 text-sm">
      <p className="flex items-center gap-1 font-medium">
        <AlertTriangle aria-hidden="true" className="size-4" />
        Os valores mudaram desde a sua revisão.
      </p>
      <ul>
        {changed.map((line) => {
          const before = accepted.lines.find((candidate) => candidate.itemId === line.itemId);
          const name = cart.items.find((item) => item.id === line.itemId)?.nftName ?? line.nftId;
          return (
            <li key={line.itemId}>
              {name}: de {before ? formatEth(before.unitPrice) : "?"} para {formatEth(line.unitPrice)} ETH
            </li>
          );
        })}
      </ul>
      <p>
        Total: de {formatEth(accepted.total)} para {formatEth(current.total)} ETH.
      </p>
    </div>
  );
}

type ReviewProps = {
  userId: string;
  cart: Cart;
  wallet: Wallet;
  network: Chain;
  note: string;
  phase: Phase;
  message: string | undefined;
  onBack: () => void;
  onConfirm: (quote: Quote) => void;
};

function ReviewStep({ userId, cart, wallet, network, note, phase, message, onBack, onConfirm }: ReviewProps): JSX.Element {
  const quote = useQuery(checkoutQuoteQuery(userId, network, cart.version));
  const [accepted, setAccepted] = useState<Quote | null>(null);
  useNftSubscription(cart.items.map((item) => item.nftId));

  if (quote.data && accepted?.id !== quote.data.id && (!accepted || moneySignature(accepted) === moneySignature(quote.data))) {
    setAccepted(quote.data);
  }

  if (quote.isPending) {
    return (
      <div aria-busy="true" className="flex max-w-2xl flex-col gap-3">
        <p className="text-sm text-text-secondary">Calculando o pedido na {CHAIN_LABELS[network]}...</p>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }
  if (quote.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-2">
        <p>Não foi possível calcular o pedido.</p>
        <Button variant="outline" onClick={() => void quote.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const current = quote.data;
  const hasChanged = accepted !== null && moneySignature(accepted) !== moneySignature(current);
  const isSubmitting = phase.kind === "submitting";
  const canConfirm = !hasChanged && current.purchasable && phase.kind === "idle" && !quote.isFetching;

  return (
    <section aria-labelledby="review-title" className="flex w-full max-w-2xl flex-col gap-5 self-center border-b-8 border-primary bg-surface-card p-6 md:p-8">
      <h2 id="review-title" className="text-lg font-bold">
        Revise o pedido
      </h2>
      {message && <FormError message={message} />}
      {hasChanged && accepted && <QuoteChanges accepted={accepted} current={current} cart={cart} />}
      {!current.purchasable && <FormError message="Algum item ficou indisponível. Ajuste o carrinho para continuar." />}
      <ul aria-label="Itens do pedido" className="flex flex-col gap-3 border-y border-border-strong py-4 text-sm">
        {current.lines.map((line) => {
          const item = cart.items.find((candidate) => candidate.id === line.itemId);
          return (
            <li key={line.itemId} className="flex items-center gap-3">
              {item && <img src={item.cover.url} alt="" width={56} height={56} className="size-14 shrink-0 rounded-md object-cover" />}
              <span className="min-w-0 flex-1">
                <span className="block font-bold">{item?.nftName ?? line.nftId}</span>
                <span className="text-secondary-base">
                  {item?.editionLabel} · (x {line.quantity})
                </span>
              </span>
              <span className="font-bold whitespace-nowrap text-text-accent">{formatEth(line.lineTotal)} ETH</span>
            </li>
          );
        })}
      </ul>
      <dl aria-label="Resumo do pagamento" className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-base">
        <dt>Subtotal</dt>
        <dd className="text-right">{formatEth(current.subtotal)} ETH</dd>
        <dt>Desconto{current.coupon ? ` (${current.coupon.code})` : ""}</dt>
        <dd className="text-right">- {formatEth(current.discount)} ETH</dd>
        <dt>Taxa de rede ({CHAIN_LABELS[network]})</dt>
        <dd className="text-right">{formatEth(current.networkFee)} ETH</dd>
        <dt className="mt-2 font-bold">Total</dt>
        <dd className="mt-2 text-right text-lg font-bold text-text-accent">{formatEth(current.total)} ETH</dd>
      </dl>
      <p className="text-sm break-all text-text-secondary">
        Carteira {wallet.label} ({PROVIDER_LABELS[wallet.provider]}), {wallet.address}
      </p>
      {note.trim() && <p className="text-sm text-text-secondary">Observação: {note.trim()}</p>}
      <div className="flex flex-wrap gap-3">
        {hasChanged && (
          <Button type="button" variant="outline" onClick={() => setAccepted(current)}>
            Aceitar novos valores
          </Button>
        )}
        {phase.kind !== "retry" && (
          <Button type="button" disabled={!canConfirm} aria-busy={isSubmitting} onClick={() => onConfirm(current)}>
            {isSubmitting ? "Enviando pedido..." : "Confirmar compra"}
          </Button>
        )}
        <Button type="button" variant="ghost" disabled={isSubmitting} onClick={onBack}>
          Voltar aos dados
        </Button>
      </div>
    </section>
  );
}

export function CheckoutPage({ userId, step, onStepChange, onOrderPlaced }: CheckoutPageProps): JSX.Element {
  const queryClient = useQueryClient();
  const me = useQuery(meQuery(userId));
  const wallets = useQuery(walletsQuery(userId));
  const cart = useQuery(cartQuery(userId));
  const [draft, updateDraft] = useCheckoutDraft(userId);
  const [attempt, setAttempt] = useState<CheckoutAttempt | null>(() => readAttempt(userId));
  const [phase, setPhase] = useState<Phase>(() => (attempt ? { kind: "submitting" } : { kind: "idle" }));
  const [reviewMessage, setReviewMessage] = useState<string>();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const isSendingRef = useRef(false);

  async function send(current: CheckoutAttempt): Promise<void> {
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setPhase({ kind: "submitting" });
    const outcome = await submitAttempt(current);
    isSendingRef.current = false;

    if (outcome.kind === "retry") {
      setPhase({ kind: "retry", message: outcome.message });
      return;
    }
    saveAttempt(userId, null);
    setAttempt(null);
    setPhase({ kind: "idle" });
    if (outcome.kind === "order") {
      onOrderPlaced(outcome.orderId);
    } else if (outcome.kind === "review" && outcome.code === "WALLET_NOT_CONNECTED") {
      await queryClient.invalidateQueries({ queryKey: keys.priv(userId).wallets });
      setFieldErrors({ connection: outcome.message });
      onStepChange("details");
    } else if (outcome.kind === "review") {
      setReviewMessage(outcome.message);
      if (outcome.quote) {
        queryClient.setQueryData(checkoutQuoteQuery(userId, outcome.quote.network, outcome.quote.cartVersion).queryKey, outcome.quote);
      } else {
        await queryClient.invalidateQueries({ queryKey: keys.priv(userId).quotes });
      }
      await queryClient.invalidateQueries({ queryKey: keys.priv(userId).cart });
      onStepChange("review");
    } else {
      setFieldErrors(serverFieldErrors(outcome.error));
      onStepChange("details");
    }
  }

  const replayRef = useRef(attempt);
  useEffect(() => {
    if (replayRef.current) void send(replayRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleConfirm(quote: Quote, wallet: Wallet, network: Chain): void {
    if (attempt) return void send(attempt);
    const body = { quoteId: quote.id, walletId: wallet.id, network, note: draft.note.trim() || null };
    const next: CheckoutAttempt = { key: crypto.randomUUID(), body };
    saveAttempt(userId, next);
    setAttempt(next);
    setReviewMessage(undefined);
    void send(next);
  }

  let content: JSX.Element;
  if (attempt && phase.kind !== "idle" && step !== "review") {
    content =
      phase.kind === "retry" ? (
        <div role="alert" className="flex flex-col items-start gap-3 bg-surface-card p-6">
          <p>{phase.message}</p>
          <Button onClick={() => void send(attempt)}>Tentar de novo</Button>
        </div>
      ) : (
        <p role="status" className="bg-surface-card p-6">
          Enviando o pedido anterior...
        </p>
      );
  } else if (me.isPending || wallets.isPending || cart.isPending) {
    content = (
      <div aria-busy="true" className="grid gap-10 lg:grid-cols-[1fr_25.3rem] lg:gap-8">
        <p className="sr-only">Carregando o pagamento...</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="skeleton h-16 w-full" />
          ))}
        </div>
        <div className="skeleton h-96 w-full" />
      </div>
    );
  } else if (me.isError || wallets.isError || cart.isError) {
    content = (
      <div role="alert" className="flex flex-col items-start gap-3 bg-surface-card p-6">
        <p className="text-lg font-bold">Não foi possível carregar o pagamento.</p>
        <Button onClick={() => void Promise.all([me.refetch(), wallets.refetch(), cart.refetch()])}>Tentar de novo</Button>
      </div>
    );
  } else if (cart.data.items.length === 0) {
    content = (
      <div className="flex flex-col items-start gap-4 bg-surface-card p-6">
        <p className="text-lg font-bold">Seu carrinho está vazio.</p>
        <Link to="/" className={buttonVariants()}>
          Explorar o catálogo
        </Link>
      </div>
    );
  } else {
    const choice = selectWallet(wallets.data, draft);
    const { wallet, network } = choice;
    const isReady = step === "review" && wallet && network && me.data.ensName && isConnectedOn(wallet, network);

    content = isReady ? (
      <>
        <ReviewStep
          userId={userId}
          cart={cart.data}
          wallet={wallet}
          network={network}
          note={draft.note}
          phase={phase}
          message={reviewMessage}
          onBack={() => onStepChange("details")}
          onConfirm={(quote) => handleConfirm(quote, wallet, network)}
        />
        {phase.kind === "retry" && attempt && (
          <div role="alert" className="flex flex-col items-start gap-3 self-center">
            <p>{phase.message}</p>
            <Button onClick={() => void send(attempt)}>Tentar de novo</Button>
          </div>
        )}
      </>
    ) : (
      <DetailsStep
        userId={userId}
        user={me.data}
        cart={cart.data}
        choice={choice}
        draft={draft}
        onDraftChange={updateDraft}
        errors={fieldErrors}
        onErrorsChange={setFieldErrors}
        onReview={() => onStepChange("review")}
      />
    );
  }

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
            <Link to="/cart" className="hover:text-text-accent">
              Carrinho
            </Link>
            <span aria-hidden="true"> / </span>
          </li>
          <li aria-current="page" className="text-text-accent">
            Pagamento
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-bold md:sr-only">Pagamento</h1>
      {content}
    </main>
  );
}
