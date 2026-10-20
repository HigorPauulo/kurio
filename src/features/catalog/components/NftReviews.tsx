import { useInfiniteQuery } from "@tanstack/react-query";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import type { Review, ReviewSummary } from "@/contracts/nft";
import { formatRating } from "../labels";
import { nftReviewsQuery } from "../queries";
import { Stars } from "./Stars";

const DATE_FORMAT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const RATINGS = [5, 4, 3, 2, 1] as const;

function pluralReviews(count: number): string {
  return `${count} ${count === 1 ? "avaliação" : "avaliações"}`;
}

function Summary({ summary }: { summary: ReviewSummary }): JSX.Element {
  return (
    <section aria-labelledby="reviews-summary-title" className="flex flex-col gap-5 self-start bg-surface-card p-6 lg:sticky lg:top-6">
      <h3 id="reviews-summary-title" className="sr-only">
        Resumo das avaliações
      </h3>
      <div className="flex items-end gap-3">
        <p className="text-display leading-none font-bold text-text-accent">{formatRating(summary.average)}</p>
        <div className="flex flex-col gap-1.5 pb-1">
          <Stars value={summary.average} className="size-4" />
          <p className="text-xs text-text-secondary">
            <span className="sr-only">Nota média de 5, </span>
            {pluralReviews(summary.count)}
          </p>
        </div>
      </div>
      <ul aria-label="Distribuição das notas" className="flex flex-col gap-2">
        {RATINGS.map((rating) => {
          const count = summary.distribution[rating];
          const percent = summary.count ? (count / summary.count) * 100 : 0;
          return (
            <li key={rating} className="grid grid-cols-[2.5rem_1fr_1.5rem] items-center gap-3 text-xs">
              <span className="text-text-secondary">
                {rating} <span aria-hidden="true">★</span>
                <span className="sr-only">{rating === 1 ? " estrela" : " estrelas"}</span>
              </span>
              <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-border-soft">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
              </span>
              <span className="text-right font-bold">
                {count}
                <span className="sr-only"> {count === 1 ? "avaliação" : "avaliações"}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ReviewItem({ review }: { review: Review }): JSX.Element {
  return (
    <li className="flex gap-4 border-b border-border-strong py-5 first:pt-0 last:border-b-0">
      <span
        aria-hidden="true"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground"
      >
        {review.author.name.charAt(0)}
      </span>
      <article className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <h3 className="text-body font-bold">{review.author.name}</h3>
          <time dateTime={review.createdAt} className="text-xs text-secondary-base">
            {DATE_FORMAT.format(new Date(review.createdAt))}
          </time>
        </header>
        <p className="flex items-center gap-2 text-xs text-text-secondary">
          <Stars value={review.rating} />
          <span className="sr-only">Nota {review.rating} de 5</span>
        </p>
        <p className="text-sm leading-[1.375rem] text-text-secondary">{review.comment}</p>
      </article>
    </li>
  );
}

function ReviewsSkeleton(): JSX.Element {
  return (
    <div aria-busy="true" className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <p className="sr-only">Carregando as avaliações...</p>
      <div className="skeleton h-56" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton h-24" />
        ))}
      </div>
    </div>
  );
}

export function NftReviews({ nftId }: { nftId: string }): JSX.Element {
  const reviews = useInfiniteQuery(nftReviewsQuery(nftId));

  if (reviews.isPending) return <ReviewsSkeleton />;
  if (reviews.isError) {
    return (
      <div role="alert" className="flex flex-col items-start gap-3 bg-surface-card p-6">
        <p>Não foi possível carregar as avaliações.</p>
        <Button variant="outline" size="sm" onClick={() => void reviews.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  const { summary } = reviews.data.pages[0];
  const items = reviews.data.pages.flatMap((page) => page.items);

  if (summary.count === 0) {
    return <p className="text-sm text-text-secondary">Este NFT ainda não tem avaliações de colecionadores.</p>;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <Summary summary={summary} />
      <div className="flex flex-col items-start gap-4">
        <ul aria-label="Avaliações" aria-busy={reviews.isFetchingNextPage} className="w-full">
          {items.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </ul>
        <p className="text-xs text-secondary-base">
          Mostrando {items.length} de {pluralReviews(summary.count)}
        </p>
        {reviews.hasNextPage && (
          <Button
            variant="outline"
            size="sm"
            disabled={reviews.isFetchingNextPage}
            aria-busy={reviews.isFetchingNextPage}
            onClick={() => void reviews.fetchNextPage()}
          >
            {reviews.isFetchingNextPage ? "Carregando..." : "Ver mais avaliações"}
          </Button>
        )}
      </div>
    </div>
  );
}
