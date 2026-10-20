import type { Category, Chain } from "@/contracts/common";
import type { CatalogSort, CatalogView } from "./search";

export const CATEGORY_LABELS: Record<Category, string> = {
  "digital-art": "Arte digital",
  photography: "Fotografia",
  music: "Música",
  "3d-art": "Arte 3D",
  collectibles: "Colecionáveis",
  generative: "Generativa",
  gaming: "Jogos",
  memberships: "Assinaturas",
  utility: "Utilidade",
};

export const CHAIN_LABELS: Record<Chain, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  base: "Base",
};

export const SORT_LABELS: Record<CatalogSort, string> = {
  recent: "Listados recentemente",
  price_asc: "Menor preço",
  price_desc: "Maior preço",
  popular: "Mais curtidos",
};

export const VIEW_TABS: { view: CatalogView | undefined; label: string }[] = [
  { view: undefined, label: "Todos os NFTs" },
  { view: "new", label: "Novos lançamentos" },
  { view: "trending", label: "Em alta" },
];

const RATING_FORMAT = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatRating(value: number): string {
  return RATING_FORMAT.format(value);
}
