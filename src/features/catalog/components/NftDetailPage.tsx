import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, CircleOff, Heart, Minus, Plus, Star } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { SearchIcon } from "@/components/icons/KurioIcons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { purchaseLimit, type Edition, type Nft } from "@/contracts/nft";
import { formatEth } from "@/lib/eth";
import { useNftSubscription } from "@/lib/realtime/instance";
import { useSession } from "@/lib/session/instance";
import { isVerticalScroller, useDragScroll } from "@/lib/useDragScroll";
import { useSwipe } from "@/lib/useSwipe";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CHAIN_LABELS, formatRating } from "../labels";
import { collectionNftsQuery, favoritesQuery, nftQuery, useToggleFavoriteMutation } from "../queries";
import { NftRail } from "./NftRail";
import { NftReviews } from "./NftReviews";
import { Stars } from "./Stars";

export type PurchaseAction = (selection: { nftId: string; editionId: string; quantity: number }) => ReactNode;

type NftDetailPageProps = {
  nftId: string;
  editionId: string | undefined;
  onEditionChange: (editionId: string) => void;
  renderPurchase: PurchaseAction;
};

const GALLERY_ARROW =
  "absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/80 text-foreground hover:bg-primary hover:text-primary-foreground";

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

function keepInView(list: HTMLElement, item: HTMLElement): void {
  const listBox = list.getBoundingClientRect();
  const itemBox = item.getBoundingClientRect();
  if (itemBox.top < listBox.top) list.scrollTop -= listBox.top - itemBox.top;
  if (itemBox.bottom > listBox.bottom) list.scrollTop += itemBox.bottom - listBox.bottom;
  if (itemBox.left < listBox.left) list.scrollLeft -= listBox.left - itemBox.left;
  if (itemBox.right > listBox.right) list.scrollLeft += itemBox.right - listBox.right;
}

function Gallery({ nft }: { nft: Nft }): JSX.Element {
  const [index, setIndex] = useState(0);
  const count = nft.images.length;
  const image = nft.images[index] ?? nft.images[0];
  const hasMany = count > 1;
  const swipe = useSwipe((direction) => go(direction));

  function go(step: number): void {
    setIndex((current) => (current + step + count) % count);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (!hasMany) return;
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  }

  return (
    <div className="grid gap-4 self-start md:grid-cols-[5.5rem_minmax(0,1fr)] lg:gap-6">
      <div
        role="group"
        aria-roledescription="galeria"
        aria-label={`Imagens de ${nft.name}`}
        className="relative min-w-0 md:order-2 md:bg-surface-card md:p-4 lg:p-5"
        onKeyDown={handleKeyDown}
      >
        <div
          className={cn("h-full overflow-hidden rounded-3xl max-md:shadow-lg", hasMany && "touch-pan-y select-none", swipe.offset !== null && "cursor-grabbing")}
          {...(hasMany ? swipe.handlers : {})}
        >
          <img
            key={image.url + index}
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            fetchPriority={index === 0 ? "high" : "auto"}
            draggable={false}
            style={swipe.offset ? { transform: `translateX(${swipe.offset}px)` } : undefined}
            className={cn(
              "aspect-square size-full bg-surface-raised object-cover",
              hasMany && "cursor-grab",
              swipe.offset === null && "transition-transform duration-300",
            )}
          />
        </div>
        <ZoomButton nft={nft} index={index} onIndexChange={setIndex} />
        {hasMany && (
          <>
            <button type="button" aria-label="Imagem anterior" onClick={() => go(-1)} className={cn(GALLERY_ARROW, "left-2 md:left-6 lg:left-7")}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button type="button" aria-label="Próxima imagem" onClick={() => go(1)} className={cn(GALLERY_ARROW, "right-2 md:right-6 lg:right-7")}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <p aria-live="polite" className="absolute bottom-3 left-1/2 md:bottom-7 z-10 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs">
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>
      <ThumbnailStrip images={nft.images} index={index} onSelect={setIndex} />
    </div>
  );
}

type StripEdges = { start: boolean; end: boolean };

function measureEdges(list: HTMLElement): StripEdges {
  const [position, size, client] = isVerticalScroller(list)
    ? [list.scrollTop, list.scrollHeight, list.clientHeight]
    : [list.scrollLeft, list.scrollWidth, list.clientWidth];
  return { start: position > 1, end: position + client < size - 1 };
}

type ThumbnailStripProps = { images: Nft["images"]; index: number; onSelect: (index: number) => void };

function ThumbnailStrip({ images, index, onSelect }: ThumbnailStripProps): JSX.Element {
  const listRef = useRef<HTMLUListElement>(null);
  const dragScroll = useDragScroll<HTMLUListElement>();
  const [edges, setEdges] = useState<StripEdges>({ start: false, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const thumb = list.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (thumb) keepInView(list, thumb);
    setEdges(measureEdges(list));
  }, [index]);

  return (
    <div className="relative min-w-0 md:order-1">
      <ul
        ref={listRef}
        aria-label="Galeria"
        onScroll={(event) => setEdges(measureEdges(event.currentTarget))}
        {...dragScroll}
        className="flex cursor-grab gap-3 overflow-x-auto select-none [scrollbar-width:none] md:absolute md:inset-0 md:flex-col md:overflow-x-hidden md:overflow-y-auto lg:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {images.map((thumbnail, thumbnailIndex) => (
          <li key={thumbnailIndex} className="w-20 shrink-0 md:w-full">
            <button
              type="button"
              data-index={thumbnailIndex}
              aria-label={`Ver imagem ${thumbnailIndex + 1} de ${images.length}`}
              aria-pressed={thumbnailIndex === index}
              onClick={() => onSelect(thumbnailIndex)}
              className="block w-full overflow-hidden rounded-md border-2 border-transparent opacity-70 outline-none hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/60 aria-pressed:border-primary aria-pressed:opacity-100"
            >
              <img src={thumbnail.url} alt="" width={88} height={88} draggable={false} className="aspect-square w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-background to-transparent transition-opacity md:inset-x-0 md:top-0 md:bottom-auto md:h-14 md:w-auto md:bg-linear-to-b",
          edges.start ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-background to-transparent transition-opacity md:inset-x-0 md:top-auto md:bottom-0 md:h-14 md:w-auto md:bg-linear-to-t",
          edges.end ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}

type ZoomButtonProps = { nft: Nft; index: number; onIndexChange: (index: number) => void };

function ZoomButton({ nft, index, onIndexChange }: ZoomButtonProps): JSX.Element {
  const count = nft.images.length;
  const image = nft.images[index] ?? nft.images[0];
  const hasMany = count > 1;
  const swipe = useSwipe((direction) => go(direction));

  function go(step: number): void {
    onIndexChange((index + step + count) % count);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (!hasMany) return;
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Ampliar a imagem"
            className="absolute top-3 right-3 z-10 flex size-9 items-center justify-center rounded-full bg-ink text-foreground hover:text-text-accent md:top-6 md:right-6 lg:top-7 lg:right-7"
          />
        }
      >
        <SearchIcon className="size-4.5" />
      </DialogTrigger>
      <DialogContent className="p-3 sm:max-w-3xl" onKeyDown={handleKeyDown}>
        <DialogTitle className="sr-only">{image.alt}</DialogTitle>
        <div
          className={cn("relative overflow-hidden rounded-2xl", hasMany && "touch-pan-y select-none")}
          {...(hasMany ? swipe.handlers : {})}
        >
          <img
            src={image.url}
            alt={image.alt}
            width={image.width}
            height={image.height}
            draggable={false}
            style={swipe.offset ? { transform: `translateX(${swipe.offset}px)` } : undefined}
            className={cn("aspect-square w-full object-cover", hasMany && "cursor-grab", swipe.offset === null && "transition-transform duration-300")}
          />
        </div>
        {hasMany && (
          <>
            <button type="button" aria-label="Imagem anterior" onClick={() => go(-1)} className={cn(GALLERY_ARROW, "left-6")}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button type="button" aria-label="Próxima imagem" onClick={() => go(1)} className={cn(GALLERY_ARROW, "right-6")}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <p aria-live="polite" className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs">
              {index + 1} / {count}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
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
              className="group/edition relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-input px-2.5 text-caption text-text-secondary hover:border-primary has-checked:border-primary has-checked:bg-surface-raised has-checked:font-bold has-checked:text-text-accent has-disabled:cursor-not-allowed has-disabled:line-through has-disabled:opacity-60 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="edition"
                value={edition.id}
                checked={edition.id === selected.id}
                disabled={isBlocked}
                aria-label={`${edition.label} · ${formatEth(edition.price)} ETH`}
                aria-describedby={isBlocked ? `${edition.id}-reason` : undefined}
                onChange={() => onChange(edition.id)}
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
              />
              <Check aria-hidden="true" className="hidden size-3.5 group-has-checked/edition:block" />
              {edition.label}
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

type QuantityFieldProps = { nftId: string; edition: Edition; renderPurchase: PurchaseAction; favorite: ReactNode };

const QUANTITY_BUTTON =
  "h-7.5 w-5 rounded-full border border-ink p-0 shadow-md md:h-12 md:w-8 [&_svg:not([class*='size-'])]:size-3.5 md:[&_svg:not([class*='size-'])]:size-5";

function QuantityField({ nftId, edition, renderPurchase, favorite }: QuantityFieldProps): JSX.Element {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const limit = purchaseLimit(edition);
  const [draft, setDraft] = useState("1");

  if (edition.status !== "available" || limit < 1) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm font-medium text-destructive">
          {getBlockReason(edition)}
        </p>
        <div className="hidden md:block">{favorite}</div>
      </div>
    );
  }

  function clamp(value: number): number {
    if (!Number.isFinite(value)) return 1;
    return Math.min(Math.max(Math.trunc(value), 1), limit);
  }

  const quantity = clamp(Number.parseInt(draft, 10));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="text-body font-medium text-text-secondary md:hidden">
            Qtd.
          </span>
          <label htmlFor={inputId} className="sr-only">
            Quantidade
          </label>
          <Button
            type="button"
            className={QUANTITY_BUTTON}
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
            className="h-8 w-8 appearance-none rounded-md bg-transparent text-center text-lg md:text-xl [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <Button
            type="button"
            className={QUANTITY_BUTTON}
            aria-label="Aumentar quantidade"
            disabled={quantity >= limit}
            onClick={() => setDraft(String(clamp(quantity + 1)))}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
        <p className="self-center text-xl font-bold text-text-accent md:hidden">{formatEth(edition.price)} ETH</p>
        <div className="flex flex-wrap items-start gap-2 max-md:w-full">
          {renderPurchase({ nftId, editionId: edition.id, quantity })}
          <div className="hidden md:block">{favorite}</div>
        </div>
      </div>
      <p id={hintId} className="text-xs text-secondary-base">
        Até {limit} {limit === 1 ? "unidade" : "unidades"} por pedido nesta edição.
      </p>
    </div>
  );
}

const FAVORITE_ICON =
  "size-9 rounded-full border border-border-strong bg-surface-raised p-0 text-text-accent hover:bg-surface-raised hover:text-foreground";

type FavoriteProps = { nftId: string; isCompact?: boolean };

function FavoriteButton({ nftId, userId, isCompact = false }: FavoriteProps & { userId: string }): JSX.Element {
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

  if (isCompact) {
    return (
      <Button
        type="button"
        variant="ghost"
        className={FAVORITE_ICON}
        aria-label="Favoritar"
        aria-pressed={isFavorite}
        disabled={!favorites.data}
        onClick={() => toggle.mutate({ nftId, isFavorite: !isFavorite })}
      >
        <Heart aria-hidden="true" className={cn("size-4", isFavorite && "fill-current")} />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-10 min-w-32.5 text-sm font-medium"
      aria-pressed={isFavorite}
      disabled={!favorites.data}
      onClick={() => toggle.mutate({ nftId, isFavorite: !isFavorite })}
    >
      <Heart aria-hidden="true" className={isFavorite ? "fill-current" : undefined} />
      {isFavorite ? "Favoritado" : "Favoritar"}
    </Button>
  );
}

function FavoriteAction({ nftId, isCompact = false }: FavoriteProps): JSX.Element {
  const session = useSession();

  if (session.status === "authenticated") {
    return <FavoriteButton nftId={nftId} userId={session.session.user.id} isCompact={isCompact} />;
  }
  if (isCompact) {
    return (
      <Link
        to="."
        search={(previous) => ({ ...previous, auth: "login" })}
        resetScroll={false}
        aria-label="Favoritar (entre na sua conta)"
        className={cn(buttonVariants({ variant: "ghost" }), FAVORITE_ICON)}
      >
        <Heart aria-hidden="true" className="size-4" />
      </Link>
    );
  }
  return (
    <Link
      to="."
      search={(previous) => ({ ...previous, auth: "login" })}
      resetScroll={false}
      className={cn(buttonVariants({ variant: "outline" }), "h-10 min-w-32.5 text-sm font-medium")}
    >
      <Heart aria-hidden="true" />
      Favoritar
      <span className="sr-only"> (entre na sua conta)</span>
    </Link>
  );
}

function RatingPill({ average, count }: Nft["rating"]): JSX.Element {
  return (
    <p className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-primary px-2 text-sm">
      <Star aria-hidden="true" className="size-3.5 fill-current text-text-accent" />
      <span className="sr-only">Nota </span>
      <span className="font-medium">{formatRating(average)}</span>
      <span className="sr-only"> de 5, </span>
      <span className="text-text-secondary">
        ({count}
        <span className="sr-only"> {count === 1 ? "avaliação" : "avaliações"}</span>)
      </span>
    </p>
  );
}

function MobileTopBar({ nftId }: { nftId: string }): JSX.Element {
  return (
    <div className="flex items-center justify-between md:hidden">
      <Link
        to="/"
        hash="mercado"
        aria-label="Voltar ao mercado"
        className="flex size-9 items-center justify-center rounded-full border border-border-strong bg-surface-raised hover:text-text-accent"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
      </Link>
      <FavoriteAction nftId={nftId} isCompact />
    </div>
  );
}

function Rating({ average, count }: Nft["rating"]): JSX.Element {
  return (
    <p className="flex items-center gap-2 text-sm">
      <Stars value={average} />
      <span className="sr-only">Nota {formatRating(average)} de 5, </span>
      {count} {count === 1 ? "avaliação" : "avaliações"} de colecionadores
    </p>
  );
}

function ShareLinks({ name }: { name: string }): JSX.Element {
  const location = useLocation();
  const url = `${window.location.origin}${location.pathname}`;
  const encodedUrl = encodeURIComponent(url);
  const links = [
    { label: "LinkedIn", icon: "/images/icons/share-linkedin.svg", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    {
      label: "e-mail",
      icon: "/images/icons/share-email.svg",
      href: `mailto:?subject=${encodeURIComponent(name)}&body=${encodedUrl}`,
    },
    { label: "X", icon: "/images/icons/share-x.svg", href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodeURIComponent(name)}` },
  ];

  return (
    <div className="flex items-center gap-3 text-sm font-bold">
      <span>Compartilhar este NFT:</span>
      <ul className="flex items-center gap-1">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Compartilhar por ${link.label}`}
              className="flex size-6 items-center justify-center rounded-sm hover:opacity-80"
            >
              <img src={link.icon} alt="" width={16} height={16} className="h-3.5 w-auto" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CollectionRail({ nftId, collectionId }: { nftId: string; collectionId: string }): JSX.Element | null {
  const collection = useQuery(collectionNftsQuery(collectionId));
  if (collection.isError) return null;
  return (
    <NftRail
      title="Mais desta coleção"
      listLabel="NFTs da mesma coleção"
      items={collection.data?.items.filter((item) => item.id !== nftId) ?? []}
      isPending={collection.isPending}
    />
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
        <nav aria-label="Trilha" className="hidden text-sm font-bold md:block">
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
        <div className="grid md:grid-cols-2 md:gap-8 lg:grid-cols-[1fr_33rem]">
          <div className="flex flex-col gap-2 max-md:-mx-4 max-md:-mt-6 max-md:bg-linear-to-br max-md:from-surface-card max-md:to-surface-raised max-md:px-7 max-md:pt-6 max-md:pb-14 md:self-start">
            <MobileTopBar nftId={nft.id} />
            <Gallery nft={nft} />
          </div>
          <div className="flex min-w-0 flex-col gap-5 max-md:relative max-md:-mx-4 max-md:-mt-8 max-md:rounded-t-[1.9375rem] max-md:bg-surface-card max-md:px-6 max-md:pt-8 max-md:pb-6">
            <div className="flex flex-col gap-3 md:border-b md:border-border-strong md:pb-4">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-xl font-bold md:text-2xl lg:text-3xl">{nft.name}</h1>
                <div className="md:hidden">
                  <RatingPill average={nft.rating.average} count={nft.rating.count} />
                </div>
              </div>
              <div className="hidden flex-wrap items-baseline justify-between gap-2 md:flex">
                <p className="text-title font-bold text-text-accent">{formatEth(edition.price)} ETH</p>
                <Rating average={nft.rating.average} count={nft.rating.count} />
              </div>
            </div>
            <section aria-labelledby="about-title" className="flex flex-col gap-3">
              <h2 id="about-title" className="text-sm font-bold max-md:sr-only">
                Sobre este NFT:
              </h2>
              <p className="text-sm leading-[1.375rem] text-text-secondary">{nft.description}</p>
            </section>
            <EditionPicker nft={nft} selected={edition} onChange={onEditionChange} />
            <div className="max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:rounded-t-[2.5rem] max-md:bg-surface-card max-md:px-6 max-md:pt-5 max-md:pb-[max(2.25rem,env(safe-area-inset-bottom))] max-md:shadow-[0_0_10px_var(--color-ink)]">
              <QuantityField
                key={edition.id}
                nftId={nft.id}
                edition={edition}
                renderPurchase={renderPurchase}
                favorite={<FavoriteAction nftId={nft.id} />}
              />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-3 text-sm leading-5 text-secondary-base">
              <dt className="whitespace-nowrap">ID do token:</dt>
              <dd>{nft.tokenId}</dd>
              <dt>Coleção:</dt>
              <dd>{nft.collection.name}</dd>
              <dt>Criador:</dt>
              <dd>{nft.creator.name}</dd>
            </dl>
            <ShareLinks name={nft.name} />
          </div>
        </div>
      </div>
      <Tabs defaultValue="details" aria-label="Informações do NFT">
        <TabsList>
          <TabsTab value="details">Detalhes do NFT</TabsTab>
          <TabsTab value="reviews">Avaliações de colecionadores ({nft.rating.count})</TabsTab>
        </TabsList>
        <TabsPanel value="details">
          <dl className="flex flex-col gap-1 text-sm leading-[1.375rem]">
            <dt className="font-bold">Descrição:</dt>
            <dd className="mb-3 text-text-secondary">{nft.description}</dd>
            <dt className="font-bold">Categoria:</dt>
            <dd className="mb-3 text-text-secondary">{CATEGORY_LABELS[nft.category]}</dd>
            <dt className="font-bold">Curtidas:</dt>
            <dd className="mb-3 text-text-secondary">{nft.likes}</dd>
            <dt className="font-bold">Rede:</dt>
            <dd className="text-text-secondary">Cunhado na {CHAIN_LABELS[nft.chain]}.</dd>
          </dl>
        </TabsPanel>
        <TabsPanel value="reviews">
          <NftReviews nftId={nft.id} />
        </TabsPanel>
      </Tabs>
      <CollectionRail nftId={nft.id} collectionId={nft.collection.id} />
    </main>
  );
}
