import { z } from "zod";
import { categorySchema, chainSchema, ethAmountSchema, type EthAmount } from "@/contracts/common";
import { catalogSortSchema, catalogStatusSchema, catalogViewSchema } from "@/contracts/nft";
import { compareEth } from "@/lib/eth";

export const CATALOG_PAGE_SIZE = 12;

export type CatalogSort = z.infer<typeof catalogSortSchema>;
export type CatalogStatus = z.infer<typeof catalogStatusSchema>;
export type CatalogView = z.infer<typeof catalogViewSchema>;

export type CatalogSearch = {
  q?: string;
  category?: string;
  chain?: string;
  status?: CatalogStatus;
  view?: CatalogView;
  priceMin?: EthAmount;
  priceMax?: EthAmount;
  sort?: Exclude<CatalogSort, "recent">;
  page?: number;
};

export type CatalogFilters = Omit<CatalogSearch, "q" | "sort" | "page" | "view">;

export const CLEARED_FILTERS: { [Key in keyof Required<CatalogFilters>]: undefined } = {
  category: undefined,
  chain: undefined,
  status: undefined,
  priceMin: undefined,
  priceMax: undefined,
};

function commaParam<Options extends z.ZodEnum>(options: Options): z.ZodType<string | undefined, unknown> {
  return z
    .string()
    .optional()
    .catch(undefined)
    .transform((value) => {
      if (!value) return undefined;
      const accepted = value.split(",").filter((item) => options.safeParse(item).success);
      const unique = [...new Set(accepted)].sort();
      return unique.length > 0 ? unique.join(",") : undefined;
    });
}

const catalogSearchSchema = z.object({
  q: z.string().trim().min(1).max(80).optional().catch(undefined),
  category: commaParam(categorySchema),
  chain: commaParam(chainSchema),
  status: catalogStatusSchema.optional().catch(undefined),
  view: catalogViewSchema.optional().catch(undefined),
  priceMin: ethAmountSchema.optional().catch(undefined),
  priceMax: ethAmountSchema.optional().catch(undefined),
  sort: catalogSortSchema.exclude(["recent"]).optional().catch(undefined),
  page: z.coerce.number().int().min(2).optional().catch(undefined),
});

export function parseCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const search = catalogSearchSchema.parse(raw);
  if (search.priceMin && search.priceMax && compareEth(search.priceMin, search.priceMax) > 0) {
    return { ...search, priceMin: undefined, priceMax: undefined };
  }
  return search;
}

export function splitParam<Item extends string>(value: string | undefined): Item[] {
  return value ? (value.split(",") as Item[]) : [];
}

export function joinParam(values: readonly string[]): string | undefined {
  return values.length > 0 ? [...values].sort().join(",") : undefined;
}

export function hasActiveFilters(search: CatalogSearch): boolean {
  return Boolean(search.q ?? search.view ?? search.category ?? search.chain ?? search.status ?? search.priceMin ?? search.priceMax);
}
