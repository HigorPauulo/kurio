import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Heart, Minus, Plus } from "lucide-react";
import { useId, useState, type JSX, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Edition, Nft } from "@/contracts/nft";
import { formatEth } from "@/lib/eth";
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

function getQuantityLimit(edition: Edition): number {
  return Math.min(edition.available, edition.maxPerOrder);
}

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
    <div className="flex flex-col gap-3 md:flex-row-reverse">
      <img
        src={image.url}
        alt={image.alt}
        width={image.width}
        height={image.height}
        fetchPriority="high"
        className="aspect-square w-full rounded-xl bg-muted object-cover md:w-96"
      />
      {nft.images.length > 1 && (
        <ul aria-label="Galeria" className="flex gap-2 md:flex-col">
          {nft.images.map((thumbnail, thumbnailIndex) => (
            <li key={thumbnailIndex}>
              <button
                type="button"
                aria-label={`Ver imagem ${thumbnailIndex + 1} de ${nft.images.length}`}
                aria-pressed={thumbnailIndex === index}
                onClick={() => setIndex(thumbnailIndex)}
                className="rounded-lg border-2 border-transparent outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-pressed:border-primary"
              >
                <img src={thumbnail.url} alt="" width={64} height={64} className="size-16 rounded-md object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditionPicker({ nft, selected, onChange }: { nft: Nft; selected: Edition; onChange: (editionId: string) => void }): JSX.Element {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium">Edição</legend>
      {nft.editions.map((edition) => {
        const isBlocked = edition.status !== "available";
        const reasonId = `${edition.id}-reason`;
        return (
          <label
            key={edition.id}
            className="flex items-start gap-2 rounded-lg border p-3 text-sm has-checked:border-primary has-disabled:opacity-70"
          >
            <input
              type="radio"
              name="edition"
              value={edition.id}
              checked={edition.id === selected.id}
              disabled={isBlocked}
              aria-describedby={isBlocked ? reasonId : undefined}
              onChange={() => onChange(edition.id)}
              className="mt-0.5"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">
                {edition.label} · {formatEth(edition.price)} ETH
              </span>
              <span className="text-muted-foreground">
                {edition.available} de {edition.supply} disponíveis
              </span>
              {isBlocked && (
                <span id={reasonId} className="text-destructive">
                  {getBlockReason(edition)}
                </span>
              )}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

type QuantityFieldProps = { nftId: string; edition: Edition; renderPurchase: PurchaseAction };

function QuantityField({ nftId, edition, renderPurchase }: QuantityFieldProps): JSX.Element {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const limit = getQuantityLimit(edition);
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium">
        Quantidade
      </label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
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
          className="h-8 w-16 rounded-lg border bg-background text-center text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Aumentar quantidade"
          disabled={quantity >= limit}
          onClick={() => setDraft(String(clamp(quantity + 1)))}
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        Até {limit} {limit === 1 ? "unidade" : "unidades"} por pedido nesta edição.
      </p>
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

export function NftDetailPage({ nftId, editionId, onEditionChange, renderPurchase }: NftDetailPageProps): JSX.Element {
  const { data: nft } = useQuery(nftQuery(nftId));
  if (!nft) return <main className="p-6">Carregando o NFT...</main>;
  const edition = pickEdition(nft, editionId);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 p-4 md:p-6">
      <nav aria-label="Trilha" className="text-sm">
        <ol className="flex gap-1">
          <li>
            <Link to="/" className="underline underline-offset-4">
              Início
            </Link>
            <span aria-hidden="true"> / </span>
          </li>
          <li aria-current="page">{nft.name}</li>
        </ol>
      </nav>
      <div className="flex flex-col gap-8 md:flex-row">
        <Gallery nft={nft} />
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold md:text-3xl">{nft.name}</h1>
            <p className="text-xl font-medium">{formatEth(edition.price)} ETH</p>
            <p className="text-sm text-muted-foreground">
              {nft.likes} {nft.likes === 1 ? "curtida" : "curtidas"}
            </p>
          </div>
          <section aria-labelledby="about-title" className="flex flex-col gap-1">
            <h2 id="about-title" className="font-medium">
              Sobre este NFT
            </h2>
            <p className="text-sm">{nft.description}</p>
          </section>
          <EditionPicker nft={nft} selected={edition} onChange={onEditionChange} />
          <QuantityField key={edition.id} nftId={nft.id} edition={edition} renderPurchase={renderPurchase} />
          <div>
            <FavoriteAction nftId={nft.id} />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Coleção</dt>
            <dd>{nft.collection.name}</dd>
            <dt className="text-muted-foreground">Criador</dt>
            <dd>{nft.creator.name}</dd>
            <dt className="text-muted-foreground">Categoria</dt>
            <dd>{CATEGORY_LABELS[nft.category]}</dd>
            <dt className="text-muted-foreground">Rede</dt>
            <dd>{CHAIN_LABELS[nft.chain]}</dd>
          </dl>
        </div>
      </div>
    </main>
  );
}
