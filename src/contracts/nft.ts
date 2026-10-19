import { z } from "zod";
import {
  categorySchema,
  chainSchema,
  dateTimeSchema,
  editionIdSchema,
  ethAmountSchema,
  imageSchema,
  nftIdSchema,
  pageSchema,
} from "./common";
import { compareEth } from "@/lib/eth";

export const editionStatusSchema = z.enum(["available", "sold_out", "unavailable"]);
export const catalogStatusSchema = z.enum(["available", "sold_out"]);
export const catalogSortSchema = z.enum(["recent", "price_asc", "price_desc", "popular"]);

export const editionSchema = z.object({
  id: editionIdSchema,
  label: z.string(),
  price: ethAmountSchema,
  available: z.number().int().min(0),
  supply: z.number().int().min(0),
  maxPerOrder: z.number().int().min(1),
  status: editionStatusSchema,
});

export const nftSchema = z.object({
  id: nftIdSchema,
  name: z.string(),
  description: z.string(),
  collection: z.object({ id: z.string(), name: z.string() }),
  creator: z.object({ id: z.string(), name: z.string(), avatarUrl: z.string() }),
  category: categorySchema,
  chain: chainSchema,
  images: z.array(imageSchema).min(1),
  editions: z.array(editionSchema).min(1),
  priceFrom: ethAmountSchema,
  featured: z.boolean(),
  likes: z.number().int().min(0),
  createdAt: dateTimeSchema,
  version: z.number().int().min(0),
});

export const nftSummarySchema = nftSchema
  .pick({
    id: true,
    name: true,
    collection: true,
    creator: true,
    category: true,
    chain: true,
    priceFrom: true,
    likes: true,
    version: true,
  })
  .extend({ cover: imageSchema, status: catalogStatusSchema });

function commaList<Item extends z.ZodType<unknown, string>>(
  item: Item,
): z.ZodType<z.output<Item>[] | undefined, string | undefined> {
  return z
    .string()
    .optional()
    .transform((value) => (value ? value.split(",").filter(Boolean) : undefined))
    .pipe(z.array(item).min(1).optional());
}

export const nftListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(80).optional(),
    category: commaList(categorySchema),
    chain: commaList(chainSchema),
    status: catalogStatusSchema.optional(),
    priceMin: ethAmountSchema.optional(),
    priceMax: ethAmountSchema.optional(),
    sort: catalogSortSchema.default("recent"),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(48).default(12),
  })
  .refine(
    ({ priceMin, priceMax }) =>
      priceMin === undefined || priceMax === undefined || compareEth(priceMin, priceMax) <= 0,
    { message: "O preço mínimo não pode passar do máximo.", path: ["priceMax"] },
  );

export const nftListResponseSchema = pageSchema(nftSummarySchema).extend({
  appliedQuery: z.record(z.string(), z.unknown()),
});

export const featuredNftsResponseSchema = z.array(nftSummarySchema).max(6);

export const favoritesResponseSchema = z.object({
  nftIds: z.array(nftIdSchema),
});

export type Edition = z.infer<typeof editionSchema>;
export type Nft = z.infer<typeof nftSchema>;
export type NftSummary = z.infer<typeof nftSummarySchema>;
export type NftListQuery = z.infer<typeof nftListQuerySchema>;
export type NftListQueryInput = z.input<typeof nftListQuerySchema>;
export type NftListResponse = z.infer<typeof nftListResponseSchema>;
