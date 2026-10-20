import type { Category, Chain, EthAmount } from "@/contracts/common";
import type { Edition, Nft } from "@/contracts/nft";
import { refreshNft } from "../db/nftUpdates";
import { stripAccents } from "../text";

const PLACEHOLDER_IMAGE = "/images/nfts/placeholder.svg";
const FIRST_CREATED_AT = Date.parse("2026-09-01T12:00:00.000Z");
const DAY_MS = 86_400_000;

const CREATORS = {
  lia: { id: "cre_lia", name: "Lia Monteiro", avatarUrl: PLACEHOLDER_IMAGE },
  kenji: { id: "cre_kenji", name: "Kenji Duarte", avatarUrl: PLACEHOLDER_IMAGE },
  noa: { id: "cre_noa", name: "Noa Ferraz", avatarUrl: PLACEHOLDER_IMAGE },
  iris: { id: "cre_iris", name: "Íris Calado", avatarUrl: PLACEHOLDER_IMAGE },
  theo: { id: "cre_theo", name: "Theo Brandão", avatarUrl: PLACEHOLDER_IMAGE },
  maya: { id: "cre_maya", name: "Maya Sato", avatarUrl: PLACEHOLDER_IMAGE },
} as const;

type EditionRow = [
  label: string,
  price: string,
  available: number,
  supply: number,
  maxPerOrder: number,
  unavailable?: true,
];

type NftRow = {
  name: string;
  collection: string;
  creator: keyof typeof CREATORS;
  category: Category;
  chain: Chain;
  likes: number;
  featured?: true;
  images?: number;
  editions: EditionRow[];
};

const ROWS: NftRow[] = [
  { name: "Emerald Ape #042", collection: "Apes Esmeralda", creator: "lia", category: "digital-art", chain: "ethereum", likes: 412, featured: true, images: 2, editions: [["Padrão", "2.38", 8, 20, 3], ["Ouro", "4.5", 2, 5, 1]] },
  { name: "Violet Nomad #314", collection: "Nômades", creator: "kenji", category: "photography", chain: "polygon", likes: 288, featured: true, editions: [["Padrão", "8.34", 5, 10, 2]] },
  { name: "Ivory Baron #088", collection: "Barões", creator: "noa", category: "music", chain: "base", likes: 351, featured: true, editions: [["Padrão", "12.5", 1, 3, 1]] },
  { name: "Pulso Neon", collection: "Sinais", creator: "iris", category: "3d-art", chain: "ethereum", likes: 97, editions: [["Padrão", "0.75", 12, 30, 5], ["Edição da artista", "1.2", 0, 5, 1]] },
  { name: "Maré Baixa", collection: "Litoral", creator: "theo", category: "collectibles", chain: "polygon", likes: 45, editions: [["Padrão", "0.045", 40, 100, 10]] },
  { name: "Campo Gerado #7", collection: "Algoritmos", creator: "maya", category: "generative", chain: "base", likes: 503, featured: true, editions: [["Padrão", "0.18", 0, 50, 5]] },
  { name: "Arena Pixel", collection: "Arcade", creator: "kenji", category: "gaming", chain: "ethereum", likes: 76, editions: [["Padrão", "0.009", 25, 200, 20]] },
  { name: "Passe Fundador", collection: "Clube Kurio", creator: "lia", category: "memberships", chain: "polygon", likes: 230, editions: [["Padrão", "1.5", 3, 50, 1], ["Vitalício", "5", 0, 10, 1, true]] },
  { name: "Chave de Acesso", collection: "Utilidades", creator: "theo", category: "utility", chain: "base", likes: 12, editions: [["Padrão", "0.02", 60, 500, 4]] },
  { name: "Aurora Fractal", collection: "Algoritmos", creator: "maya", category: "digital-art", chain: "polygon", likes: 164, editions: [["Padrão", "0.33", 7, 20, 2]] },
  { name: "Retrato em Grão", collection: "Analógica", creator: "noa", category: "photography", chain: "base", likes: 58, editions: [["Padrão", "0.12", 0, 15, 2], ["Prova", "0.25", 0, 3, 1]] },
  { name: "Lo-fi Noturno", collection: "Sinais", creator: "iris", category: "music", chain: "ethereum", likes: 133, editions: [["Padrão", "0.06", 30, 100, 6]] },
  { name: "Escultura Vazia", collection: "Volumes", creator: "theo", category: "3d-art", chain: "polygon", likes: 71, editions: [["Padrão", "2.1", 4, 8, 2]] },
  { name: "Selo Raro 1998", collection: "Filatelia", creator: "kenji", category: "collectibles", chain: "base", likes: 9, editions: [["Padrão", "0.001", 90, 1000, 25]] },
  { name: "Ruído Branco", collection: "Algoritmos", creator: "maya", category: "generative", chain: "ethereum", likes: 266, featured: true, editions: [["Padrão", "0.42", 9, 40, 3], ["Variante", "0.9", 2, 4, 1]] },
  { name: "Chefe Final", collection: "Arcade", creator: "kenji", category: "gaming", chain: "polygon", likes: 189, editions: [["Padrão", "0.075", 0, 60, 4]] },
  { name: "Mesa Redonda", collection: "Clube Kurio", creator: "lia", category: "memberships", chain: "base", likes: 54, editions: [["Padrão", "3.25", 6, 25, 1]] },
  { name: "Bilhete Mainnet", collection: "Utilidades", creator: "theo", category: "utility", chain: "ethereum", likes: 23, editions: [["Padrão", "0.15", 0, 20, 2, true], ["Reserva", "0.2", 5, 10, 2]] },
  { name: "Cidade Submersa", collection: "Litoral", creator: "noa", category: "digital-art", chain: "base", likes: 317, featured: true, editions: [["Padrão", "6.8", 2, 5, 1]] },
  { name: "Luz de Janeiro", collection: "Analógica", creator: "iris", category: "photography", chain: "ethereum", likes: 88, editions: [["Padrão", "0.95", 11, 30, 3]] },
  { name: "Vinil Raro", collection: "Sinais", creator: "noa", category: "music", chain: "polygon", likes: 142, editions: [["Capa dupla", "2.75", 1, 2, 1], ["Padrão", "1.05", 3, 6, 1]] },
  { name: "Cubo Infinito", collection: "Volumes", creator: "maya", category: "3d-art", chain: "base", likes: 61, editions: [["Padrão", "0.5", 15, 40, 3]] },
  { name: "Figurinha Dourada", collection: "Filatelia", creator: "lia", category: "collectibles", chain: "ethereum", likes: 34, editions: [["Padrão", "0.0125", 50, 300, 10]] },
  { name: "Mapa Proibido", collection: "Arcade", creator: "kenji", category: "gaming", chain: "base", likes: 112, editions: [["Padrão", "0.205", 8, 25, 2]] },
];

function collectionId(name: string): string {
  const slug = stripAccents(name)
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
  return `col_${slug}`;
}

function buildEdition(nftNumber: string, index: number, row: EditionRow): Edition {
  const [label, price, available, supply, maxPerOrder, unavailable] = row;
  return {
    id: `ed_${nftNumber}_${index + 1}`,
    label,
    price: price as EthAmount,
    available,
    supply,
    maxPerOrder,
    status: unavailable ? "unavailable" : "available",
  };
}

function buildNft(row: NftRow, index: number): Nft {
  const number = String(index + 1).padStart(3, "0");
  const editions = row.editions.map((edition, editionIndex) =>
    buildEdition(number, editionIndex, edition),
  );
  const nft: Nft = {
    id: `nft_${number}`,
    name: row.name,
    description: `${row.name}, da coleção ${row.collection}.`,
    collection: { id: collectionId(row.collection), name: row.collection },
    creator: CREATORS[row.creator],
    category: row.category,
    chain: row.chain,
    images: Array.from({ length: row.images ?? 1 }, (_, imageIndex) => ({
      url: PLACEHOLDER_IMAGE,
      alt: `${row.name}, imagem ${imageIndex + 1}`,
      width: 600,
      height: 600,
    })),
    editions,
    priceFrom: editions[0].price,
    featured: row.featured ?? false,
    likes: row.likes,
    createdAt: new Date(FIRST_CREATED_AT + index * DAY_MS).toISOString(),
    version: 0,
  };
  refreshNft(nft);
  return nft;
}

export const NFT_FIXTURES: readonly Nft[] = ROWS.map(buildNft);
