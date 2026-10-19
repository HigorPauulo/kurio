import { z } from "zod";
import { dateTimeSchema, userIdSchema } from "./common";

const ENS_SUFFIX = ".eth";
const ENS_LABEL = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "Use ao menos 2 caracteres.")
  .max(60, "Use no máximo 60 caracteres.");

export const usernameSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{3,20}$/, "Use de 3 a 20 letras minúsculas, números ou _.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "E-mail longo demais.")
  .pipe(z.email("E-mail inválido."));

export const passwordSchema = z
  .string()
  .min(8, "Use ao menos 8 caracteres.")
  .max(72, "Use no máximo 72 caracteres.")
  .regex(/[A-Za-z]/, "Inclua ao menos uma letra.")
  .regex(/\d/, "Inclua ao menos um número.");

export const ensNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) =>
    value.endsWith(ENS_SUFFIX) ? value.slice(0, -ENS_SUFFIX.length) : value,
  )
  .pipe(
    z
      .string()
      .regex(
        ENS_LABEL,
        "Use de 3 a 63 letras minúsculas, números ou hífen, sem hífen nas pontas.",
      ),
  )
  .transform((label) => `${label}${ENS_SUFFIX}`);

export const userSchema = z.object({
  id: userIdSchema,
  email: z.string(),
  username: z.string(),
  name: z.string(),
  ensName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: dateTimeSchema,
});

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: dateTimeSchema,
  user: userSchema,
});

export const registerBodySchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Informe a senha."),
});

export const updateMeBodySchema = z
  .object({
    name: displayNameSchema,
    username: usernameSchema,
    email: emailSchema,
    ensName: ensNameSchema.nullable(),
  })
  .partial();

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual."),
  newPassword: passwordSchema,
});

export const avatarResponseSchema = z.object({
  avatarUrl: z.string().nullable(),
});

export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type UpdateMeBody = z.infer<typeof updateMeBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;
