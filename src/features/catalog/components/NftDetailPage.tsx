import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Check, CircleOff, Heart, Minus, Plus } from "lucide-react";
import { useId, useState, type JSX, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { purchaseLimit, type Edition, type Nft } from "@/contracts/nft";
import { formatEth } from "@/lib/eth";
import { useNftSubscription } from "@/lib/realtime/instance";
import { useSession } from "@/lib/session/instance";
import { CATEGORY_LABELS, CHAIN_LABELS } from "../labels";
import { favoritesQuery, nftQuery, useToggleFavoriteMutation } from "../queries";

export type PurchaseAction = (selection: { nftId: string; editionId: string; quantity: number }) => ReactNode;

type NftDetailPageProps = {
  nftId: string;
  editionId: string | undefined;
  onEditionChange: (editionId: string) => void;
  renderPurchase: PurchaseAction;
};

const BLOCK_REASONS: Record<Exclude<Edition["status"], "available">, string> = {
  sold_out: "Esgotada: não há unidades disponíveis.",
  unavailable: "Indisponível: esta edição não está à venda.",
};


function getBlockReason(edition: Edition): string {
  return edition.status === "unavailable" ? BLOCK_REASONS.unavailable : BLOCK_REASONS.sold_out;
}

function pickEdition(nft: Nft, editionId: string | undefined): Edition {
  return (
    nft.editions.find((edition) => edition.id === editionId) ??
    nft.editions.find((edition) => edition.status === "available") ??
    nft.editions[0]
  );
}

function Gallery({ nft }: { nft: Nft }): JSX.Element {
  const [index, setIndex] = useState(0);
  const image = nft.images[index] ?? nft.images[0];

  return (
    <div className="flex flex-col gap-4 md:flex-row-reverse md:items-start lg:gap-6">
      <div className="min-w-0 flex-1 bg-surface-card p-4 lg:p-5">
        <img
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          fetchPriority="high"
          className="aspect-square w-full rounded-3xl bg-surface-raised object-cover"
        />
      </div>
      {nft.images.length > 1 && (
        <ul aria-label="Galeria" className="flex gap-3 md:w-22 md:flex-col lg:gap-4">
          {nft.images.map((thumbnail, thumbnailIndex) => (
            <li key={thumbnailIndex} className="w-20 md:w-full">
              <button
                type="button"
                aria-label={`Ver imagem ${thumbnailIndex + 1} de ${nft.images.length}`}
                aria-pressed={thumbnailIndex === index}
                onClick={() => setIndex(thumbnailIndex)}
                className="block w-full overflow-hidden rounded-md border-2 border-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/60 aria-pressed:border-primary"
              >
                <img src={thumbnail.url} alt="" width={88} height={88} className="aspect-square w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditionPicker({ nft, selected, onChange }: { nft: Nft; selected: Edition; onChange: (editionId: string) => void }): JSX.Element {
  const blocked = nft.editions.filter((edition) => edition.status !== "available");

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-bold">Edição:</legend>
      <div className="flex flex-wrap gap-2">
        {nft.editions.map((edition) => {
          const isBlocked = edition.status !== "available";
          return (
            <label
              key={edition.id}
              className="group/edition relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-input px-3 text-caption text-text-secondary hover:border-primary has-checked:border-primary has-checked:bg-surface-raised has-checked:font-bold has-checked:text-text-accent has-disabled:cursor-not-allowed has-disabled:line-through has-disabled:opacity-60 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="edition"
                value={edition.id}
                checked={edition.id === selected.id}
                disabled={isBlocked}
                aria-describedby={isBlocked ? `${edition.id}-reason` : undefined}
                onChange={() => onChange(edition.id)}
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
              />
              <Check aria-hidden="true" className="hidden size-3.5 group-has-checked/edition:block" />
              {edition.label} · {formatEth(edition.price)} ETH
            </label>
          );
        })}
      </div>
      <p className="text-caption text-secondary-base">
        {selected.label}: {selected.available} de {selected.supply} disponíveis
      </p>
      {blocked.length > 0 && (
        <ul className="flex flex-col gap-1 text-caption text-destructive">
          {blocked.map((edition) => (
            <li key={edition.id} id={`${edition.id}-reason`} className="flex items-center gap-1">
              <CircleOff aria-hidden="true" className="size-3.5 shrink-0" />
              {edition.label}: {getBlockReason(edition)}
            </li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}

type QuantityFieldProps = { nftId: string; edition: Edition; renderPurchase: PurchaseAction };

function QuantityField({ nftId, edition, renderPurchase }: QuantityFieldProps): JSX.Element {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const limit = purchaseLimit(edition);
  const [draft, setDraft] = useState("1");

  if (edition.status !== "available" || limit < 1) {
    return (
      <p role="alert" className="text-sm font-medium text-destructive">
        {getBlockReason(edition)}
      </p>
    );
  }

  function clamp(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(Math.max(Math.trunc(value), 1), limit);
  }

  const quantity = clamp(Number.parseInt(draft, 10));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-bold">
          Quantidade
        </label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            className="rounded-full"
            aria-label="Diminuir quantidade"
          disabled={quantity <= 1}
            onClick={() => setDraft(String(clamp(quantity - 1)))}
          >
            <Minus aria-hidden="true" />
          </Button>
          <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={limit}
          value={draft}
          aria-describedby={hintId}
          onChange={(event) => setDraft(event.target.value)}
            onBlur={() => setDraft(String(quantity))}
            className="h-8 w-12 appearance-none rounded-md bg-transparent text-center text-lg [-moz-appearance:textfield] focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button
            type="button"
            size="icon-sm"
            className="rounded-full"
            aria-label="Aumentar quantidade"
            disabled={quantity >= limit}
            onClick={() => setDraft(String(clamp(quantity + 1)))}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        <p id={hintId} className="text-xs text-secondary-base">
          Até {limit} {limit === 1 ? "unidade" : "unidades"} por pedido nesta edição.
        </p>
      </div>
      {renderPurchase({ nftId, editionId: edition.id, quantity })}
    </div>
  );
}

function FavoriteButton({ nftId, userId }: { nftId: string; userId: string }): JSX.Element {
  const favorites = useQuery(favoritesQuery(userId));
  const toggle = useToggleFavoriteMutation(userId);
  const isFavorite = favorites.data?.includes(nftId) ?? false;

  if (favorites.isError && !favorites.data) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm" role="alert">
        <span>Não foi possível carregar os favoritos.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void favorites.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      aria-pressed={isFavorite}
      disabled={!favorites.data}
      onClick={() => toggle.mutate({ nftId, isFavorite: !isFavorite })}
    >
      <Heart aria-hidden="true" className={isFavorite ? "fill-current" : undefined} />
      {isFavorite ? "Favoritado" : "Favoritar"}
    </Button>
  );
}

function FavoriteAction({ nftId }: { nftId: string }): JSX.Element {
  const session = useSession();
  const location = useLocation();

  if (session.status === "authenticated") {
    return <FavoriteButton nftId={nftId} userId={session.session.user.id} />;
  }
  return (
    <Link to="/login" search={{ redirect: location.href }} className={buttonVariants({ variant: "outline" })}>
      <Heart aria-hidden="true" />
      Entrar para favoritar
    </Link>
  );
}

function NftDetailSkeleton(): JSX.Element {
  return (
    <main aria-busy="true" className="mx-auto grid w-full max-w-300 gap-8 px-4 pt-14 md:grid-cols-2 lg:grid-cols-[1fr_33rem]">
      <p className="sr-only">Carregando o NFT...</p>
      <div className="bg-surface-card p-4">
        <div className="skeleton aspect-square w-full rounded-3xl" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="skeleton h-8 w-2/3 rounded-sm" />
        <div className="skeleton h-6 w-1/3 rounded-sm" />
        <div className="skeleton h-24 w-full rounded-sm" />
      </div>
    </main>
  );
}

export function NftDetailPage({ nftId, editionId, onEditionChange, renderPurchase }: NftDetailPageProps): JSX.Element {
  const { data: nft } = useQuery(nftQuery(nftId));
  useNftSubscription([nftId]);
  if (!nft) return <NftDetailSkeleton />;
  const edition = pickEdition(nft, editionId);

  return (
    <main className="mx-auto flex w-full max-w-300 flex-col gap-16 px-4 pt-6 lg:gap-24 lg:pt-8">
      <div className="flex flex-col gap-4">
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
              {nft.name}
            </li>
          </ol>
        </nav>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-[1fr_33rem] lg:gap-8">
          <Gallery nft={nft} />
          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-3 border-b border-border-strong pb-4">
              <h1 className="text-2xl font-bold lg:text-3xl">{nft.name}</h1>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-title font-bold text-text-accent">{formatEth(edition.price)} ETH</p>
                <p className="flex items-center gap-1 text-sm">
                  <Heart aria-hidden="true" className="size-4 fill-current text-text-accent" />
                  {nft.likes} {nft.likes === 1 ? "curtida" : "curtidas"}
                </p>
              </div>
            </div>
            <section aria-labelledby="about-title" className="flex flex-col gap-3">
              <h2 id="about-title" className="text-sm font-bold">
                Sobre este NFT:
              </h2>
              <p className="text-sm leading-[1.375rem] text-text-secondary">{nft.description}</p>
            </section>
            <EditionPicker nft={nft} selected={edition} onChange={onEditionChange} />
            <QuantityField key={edition.id} nftId={nft.id} edition={edition} renderPurchase={renderPurchase} />
            <div>
              <FavoriteAction nftId={nft.id} />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-2 text-sm text-secondary-base">
              <dt>Coleção:</dt>
              <dd>{nft.collection.name}</dd>
              <dt>Criador:</dt>
              <dd>{nft.creator.name}</dd>
            </dl>
          </div>
        </div>
      </div>
      <section aria-labelledby="details-title" className="flex flex-col gap-4">
        <h2 id="details-title" className="self-start border-b-3 border-primary pb-2 text-lg font-bold text-text-accent">
          Detalhes do NFT
        </h2>
        <dl className="flex flex-col gap-1 border-t border-border-strong pt-4 text-sm leading-[1.375rem]">
          <dt className="font-bold">Descrição:</dt>
          <dd className="mb-3 text-text-secondary">{nft.description}</dd>
          <dt className="font-bold">Categoria:</dt>
          <dd className="mb-3 text-text-secondary">{CATEGORY_LABELS[nft.category]}</dd>
          <dt className="font-bold">Rede:</dt>
          <dd className="text-text-secondary">Cunhado na {CHAIN_LABELS[nft.chain]}.</dd>
        </dl>
      </section>
    </main>
  );
}
