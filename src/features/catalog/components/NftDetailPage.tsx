import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, CircleOff, Heart, Minus, Plus } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { SearchIcon } from "@/components/icons/KurioIcons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { purchaseLimit, type Edition, type Nft } from "@/contracts/nft";
import { formatEth } from "@/lib/eth";
import { useNftSubscription } from "@/lib/realtime/instance";
import { useSession } from "@/lib/session/instance";
import { useSwipe } from "@/lib/useSwipe";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, CHAIN_LABELS } from "../labels";
import { favoritesQuery, nftQuery, useToggleFavoriteMutation } from "../queries";

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
        className="relative min-w-0 bg-surface-card p-4 md:order-2 lg:p-5"
        onKeyDown={handleKeyDown}
      >
        <div
          className={cn("h-full overflow-hidden rounded-3xl", hasMany && "touch-pan-y select-none", swipe.offset !== null && "cursor-grabbing")}
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
            <button type="button" aria-label="Imagem anterior" onClick={() => go(-1)} className={cn(GALLERY_ARROW, "left-6 lg:left-7")}>
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button type="button" aria-label="Próxima imagem" onClick={() => go(1)} className={cn(GALLERY_ARROW, "right-6 lg:right-7")}>
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <p aria-live="polite" className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 rounded-full bg-ink/80 px-3 py-1 text-xs">
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

function isVertical(list: HTMLElement): boolean {
  return getComputedStyle(list).flexDirection === "column";
}

function measureEdges(list: HTMLElement): StripEdges {
  const [position, size, client] = isVertical(list)
    ? [list.scrollTop, list.scrollHeight, list.clientHeight]
    : [list.scrollLeft, list.scrollWidth, list.clientWidth];
  return { start: position > 1, end: position + client < size - 1 };
}

type ThumbnailStripProps = { images: Nft["images"]; index: number; onSelect: (index: number) => void };

function ThumbnailStrip({ images, index, onSelect }: ThumbnailStripProps): JSX.Element {
  const listRef = useRef<HTMLUListElement>(null);
  const dragRef = useRef<{ start: number; scroll: number; moved: boolean } | null>(null);
  const suppressNextClick = useRef(false);
  const [edges, setEdges] = useState<StripEdges>({ start: false, end: false });

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const thumb = list.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (thumb) keepInView(list, thumb);
    setEdges(measureEdges(list));
  }, [index]);

  function handlePointerDown(event: PointerEvent<HTMLUListElement>): void {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const list = event.currentTarget;
    const vertical = isVertical(list);
    dragRef.current = {
      start: vertical ? event.clientY : event.clientX,
      scroll: vertical ? list.scrollTop : list.scrollLeft,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLUListElement>): void {
    const drag = dragRef.current;
    if (!drag) return;
    const list = event.currentTarget;
    const vertical = isVertical(list);
    const delta = (vertical ? event.clientY : event.clientX) - drag.start;
    if (Math.abs(delta) > 5 && !drag.moved) {
      drag.moved = true;
      list.setPointerCapture(event.pointerId);
    }
    if (!drag.moved) return;
    if (vertical) list.scrollTop = drag.scroll - delta;
    else list.scrollLeft = drag.scroll - delta;
  }

  function handlePointerUp(): void {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) suppressNextClick.current = true;
  }

  function handleClickCapture(event: MouseEvent<HTMLUListElement>): void {
    if (!suppressNextClick.current) return;
    suppressNextClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="relative min-w-0 md:order-1">
      <ul
        ref={listRef}
        aria-label="Galeria"
        onScroll={(event) => setEdges(measureEdges(event.currentTarget))}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
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
            className="absolute top-6 right-6 z-10 flex size-9 items-center justify-center rounded-full bg-ink text-foreground hover:text-text-accent lg:top-7 lg:right-7"
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
