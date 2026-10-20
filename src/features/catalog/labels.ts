import type { Category, Chain } from "@/contracts/common";
import type { CatalogSort } from "./search";

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
  recent: "Mais recentes",
  price_asc: "Menor preço",
  price_desc: "Maior preço",
  popular: "Mais curtidos",
};
