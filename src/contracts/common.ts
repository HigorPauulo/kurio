import { z } from "zod";

export function idSchema(prefix: string): z.ZodString {
  return z.string().startsWith(`${prefix}_`, `ID inválido: esperado prefixo ${prefix}_.`);
}

export const userIdSchema = idSchema("usr");
export const nftIdSchema = idSchema("nft");
export const editionIdSchema = idSchema("ed");
export const cartIdSchema = idSchema("crt");
export const cartItemIdSchema = idSchema("itm");
export const quoteIdSchema = idSchema("qte");
export const orderIdSchema = idSchema("ord");
export const walletIdSchema = idSchema("wal");

export const ethAmountSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d{1,18})?$/, "Valor em ETH inválido.")
  .brand<"EthAmount">();

export const dateTimeSchema = z.iso.datetime();

export const chainSchema = z.enum(["ethereum", "polygon", "base"]);

export const categorySchema = z.enum([
  "digital-art",
  "photography",
  "music",
  "3d-art",
  "collectibles",
  "generative",
  "gaming",
  "memberships",
  "utility",
]);

export const imageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const quantitySchema = z.number().int().min(0);

export function pageSchema<Item extends z.ZodType>(
  item: Item,
): z.ZodObject<{
  items: z.ZodArray<Item>;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
  total: z.ZodNumber;
  totalPages: z.ZodNumber;
}> {
  return z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });
}

export type UserId = z.infer<typeof userIdSchema>;
export type NftId = z.infer<typeof nftIdSchema>;
export type EditionId = z.infer<typeof editionIdSchema>;
export type QuoteId = z.infer<typeof quoteIdSchema>;
export type OrderId = z.infer<typeof orderIdSchema>;
export type WalletId = z.infer<typeof walletIdSchema>;
export type EthAmount = z.infer<typeof ethAmountSchema>;
export type Chain = z.infer<typeof chainSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Image = z.infer<typeof imageSchema>;
