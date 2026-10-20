import type { Review, ReviewSummary } from "@/contracts/nft";

const DAY_MS = 86_400_000;

const AUTHORS = [
  "Bianca Rocha",
  "Caio Mendes",
  "Duda Albuquerque",
  "Enzo Tavares",
  "Fernanda Lins",
  "Gael Nogueira",
  "Helena Prado",
  "Igor Siqueira",
  "Júlia Campos",
  "Leo Barreto",
  "Marina Teles",
  "Otávio Reis",
];

const COMMENTS: Record<Review["rating"], string[]> = {
  5: [
    "A arte é ainda melhor em alta resolução. Chegou na carteira em segundos.",
    "Peça central da minha coleção. Os detalhes da textura são impressionantes.",
    "Criador atencioso e edição muito bem pensada. Recomendo.",
  ],
  4: [
    "Gostei muito da composição. Só queria mais edições disponíveis.",
    "Ótima procedência e metadados completos. A taxa de rede pesou um pouco.",
    "Visual forte e coerente com o resto da coleção.",
  ],
  3: [
    "Bonito, mas esperava mais variação entre as edições.",
    "Boa peça, porém o preço subiu rápido depois do lançamento.",
  ],
  2: ["A arte é boa, mas a edição esgotou antes de eu conseguir a que queria."],
  1: ["Não era o estilo que eu esperava pela miniatura."],
};

const RATING_CYCLE: Review["rating"][] = [5, 4, 5, 5, 4, 5, 5, 4, 5, 3, 4, 5, 5, 5, 4, 5, 3, 4, 5];

function seedOf(nftId: string): number {
  return Number.parseInt(nftId.replace(/\D/g, ""), 10) || 0;
}

export function reviewCountFor(nftId: string, likes: number): number {
  return nftId === "nft_001" ? 19 : 4 + ((likes + seedOf(nftId)) % 14);
}

export function buildReviews(nftId: string, count: number, createdAt: string): Review[] {
  const seed = seedOf(nftId);
  const start = Date.parse(createdAt);

  return Array.from({ length: count }, (_, index) => {
    const rating = RATING_CYCLE[(index + seed) % RATING_CYCLE.length];
    const comments = COMMENTS[rating];
    return {
      id: `rev_${nftId}_${index + 1}`,
      author: { name: AUTHORS[(index * 5 + seed) % AUTHORS.length] },
      rating,
      comment: comments[(index + seed) % comments.length],
      createdAt: new Date(start + (count - index) * DAY_MS).toISOString(),
    };
  });
}

export function summarizeReviews(reviews: Review[]): ReviewSummary {
  const distribution: ReviewSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const review of reviews) distribution[review.rating] += 1;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  const average = reviews.length ? Math.round((total / reviews.length) * 10) / 10 : 0;
  return { average, count: reviews.length, distribution };
}
