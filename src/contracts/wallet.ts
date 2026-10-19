import { z } from "zod";
import { chainSchema, dateTimeSchema, emptyToNull, walletIdSchema } from "./common";
import { displayNameSchema } from "./user";

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const ENS_NAME = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])\.eth$/;

export const walletProviderSchema = z.enum(["metamask", "walletconnect", "coinbase"]);
export const walletRoleSchema = z.enum(["primary", "secondary"]);

export const walletAddressSchema = z
  .string()
  .trim()
  .regex(EVM_ADDRESS, "Endereço inválido: use 0x seguido de 40 caracteres hexadecimais.");

export const backupAddressSchema = z.preprocess(
  emptyToNull,
  z
    .string()
    .trim()
    .refine(
      (value) => EVM_ADDRESS.test(value) || ENS_NAME.test(value.toLowerCase()),
      "Use um endereço 0x ou um nome .eth.",
    )
    .nullable(),
);

export const walletLabelSchema = z
  .string()
  .trim()
  .min(2, "Use ao menos 2 caracteres.")
  .max(40, "Use no máximo 40 caracteres.");

export const referralCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6,12}$/, "Use de 6 a 12 letras ou números.");

export const walletConnectionSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("disconnected") }),
  z.object({ status: z.literal("connected"), network: chainSchema }),
]);

export const walletSchema = z.object({
  id: walletIdSchema,
  role: walletRoleSchema,
  label: z.string(),
  provider: walletProviderSchema,
  address: z.string(),
  backupAddress: z.string().nullable(),
  networks: z.array(chainSchema).min(1),
  profileName: z.string(),
  referralCode: z.string(),
  connection: walletConnectionSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const createWalletBodySchema = z.object({
  role: walletRoleSchema,
  label: walletLabelSchema,
  provider: walletProviderSchema,
  address: walletAddressSchema,
  backupAddress: backupAddressSchema,
  networks: z.array(chainSchema).min(1, "Escolha ao menos uma rede."),
  profileName: displayNameSchema,
  referralCode: referralCodeSchema,
});

export const updateWalletBodySchema = createWalletBodySchema.partial();

export const connectWalletBodySchema = z.object({
  network: chainSchema,
});

export const walletsResponseSchema = z.array(walletSchema).max(2);

export type WalletProvider = z.infer<typeof walletProviderSchema>;
export type Wallet = z.infer<typeof walletSchema>;
export type CreateWalletBody = z.infer<typeof createWalletBodySchema>;
export type UpdateWalletBody = z.infer<typeof updateWalletBodySchema>;
