import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon } from "lucide-react";
import { useState, type ChangeEvent, type JSX, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormError, TextField } from "@/components/form/TextField";
import { Button, buttonVariants } from "@/components/ui/button";
import { emptyToNull } from "@/contracts/common";
import {
  displayNameSchema,
  emailSchema,
  ensNameSchema,
  passwordSchema,
  usernameSchema,
  type User,
} from "@/contracts/user";
import { applyApiError, getApiFieldError } from "@/lib/forms";
import { cn } from "@/lib/utils";
import {
  meQuery,
  useAvatarMutation,
  useChangePasswordMutation,
  useUpdateMeMutation,
  walletsQuery,
} from "../queries";
import { AccountLayout } from "./AccountLayout";

const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"];
const AVATAR_MAX_BYTES = 32_000;

const profileFormSchema = z.object({
  name: displayNameSchema,
  username: usernameSchema,
  email: emailSchema,
  ensName: z.preprocess(emptyToNull, ensNameSchema.nullable()),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual."),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmNewPassword, {
    message: "As senhas não conferem.",
    path: ["confirmNewPassword"],
  });

type PrimaryWalletState = { label: string; isError: boolean; onRetry: () => void };

type ProfileFormProps = { user: User; primaryWallet: PrimaryWalletState; avatar: ReactNode };

function ProfileForm({ user, primaryWallet, avatar }: ProfileFormProps): JSX.Element {
  const update = useUpdateMeMutation(user.id);
  const [saved, setSaved] = useState(false);
  const form = useForm<z.input<typeof profileFormSchema>, unknown, z.output<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name,
      username: user.username,
      email: user.email,
      ensName: user.ensName?.replace(/\.eth$/, "") ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function handleSubmit(values: z.output<typeof profileFormSchema>): Promise<void> {
    setSaved(false);
    try {
      await update.mutateAsync(values);
      setSaved(true);
    } catch (error) {
      applyApiError(error, form.setError, ["name", "username", "email", "ensName"]);
    }
  }

  return (
    <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
      <h2 className="sr-only">Dados do perfil</h2>
      <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
        <TextField label="Nome de exibição" autoComplete="name" required error={errors.name?.message} {...form.register("name")} />
        <TextField label="Nome de usuário" autoComplete="off" required error={errors.username?.message} {...form.register("username")} />
        <TextField label="E-mail" type="email" autoComplete="email" required error={errors.email?.message} {...form.register("email")} />
        <TextField label="Nome ENS" suffix=".eth" error={errors.ensName?.message} {...form.register("ensName")} />
        <TextField
          label="Apelido da carteira"
          value={primaryWallet.label}
          readOnly
          required
          editIn={{ to: "/account/wallets", label: "Editar em Carteiras" }}
        />
        {avatar}
      </div>
      {primaryWallet.isError && (
        <div className="flex items-center gap-2 text-sm" role="alert">
          <span>Não foi possível carregar a carteira principal.</span>
          <Button type="button" variant="outline" size="sm" onClick={primaryWallet.onRetry}>
            Tentar de novo
          </Button>
        </div>
      )}
      <FormError message={errors.root?.server?.message} />
      {saved && (
        <p role="status" className="text-sm text-success">
          Perfil salvo.
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="self-start px-10">
        Salvar
      </Button>
    </form>
  );
}

function AvatarField({ user }: { user: User }): JSX.Element {
  const avatar = useAvatarMutation(user.id);
  const [error, setError] = useState<string>();

  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return setError("Envie uma imagem PNG, JPEG ou WebP.");
    if (file.size > AVATAR_MAX_BYTES) return setError("A imagem deve ter até 32 KB.");
    await saveAvatar(file, "Não foi possível enviar o avatar.");
  }

  async function saveAvatar(file: File | null, fallback: string): Promise<void> {
    setError(undefined);
    await avatar.mutateAsync(file).catch((cause: unknown) => setError(getApiFieldError(cause, "file") ?? fallback));
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby="avatar-title">
      <h2 id="avatar-title" className="text-body leading-4">
        Avatar
      </h2>
      <div className="flex flex-wrap items-center gap-6">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt={`Avatar de ${user.name}`} width={50} height={50} className="size-12.5 rounded-full object-cover" />
        ) : (
          <span className="flex size-12.5 items-center justify-center rounded-full border border-border-soft bg-surface-raised text-text-accent">
            <ImageIcon aria-hidden="true" className="size-5" />
            <span className="sr-only">Nenhum avatar enviado.</span>
          </span>
        )}
        <label
          className={cn(buttonVariants(), "cursor-pointer has-focus-visible:ring-3 has-focus-visible:ring-ring/60")}
          htmlFor="avatar-file"
        >
          Alterar avatar
          <input
            id="avatar-file"
            type="file"
            className="sr-only"
            accept={AVATAR_TYPES.join(",")}
            onChange={(event) => void handleFile(event)}
          />
        </label>
        {user.avatarUrl && (
          <Button type="button" variant="ghost" onClick={() => void saveAvatar(null, "Não foi possível remover o avatar.")}>
            Remover avatar
          </Button>
        )}
      </div>
      <FormError message={error} />
    </section>
  );
}

function PasswordForm(): JSX.Element {
  const change = useChangePasswordMutation();
  const [saved, setSaved] = useState(false);
  const form = useForm<z.input<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function handleSubmit(values: z.input<typeof passwordFormSchema>): Promise<void> {
    setSaved(false);
    try {
      await change.mutateAsync({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      form.reset();
      setSaved(true);
    } catch (error) {
      applyApiError(error, form.setError, ["currentPassword", "newPassword"]);
    }
  }

  return (
    <form noValidate className="flex flex-col gap-6 sm:max-w-104" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
      <h2 className="text-lg font-bold">Alterar senha</h2>
      <TextField label="Senha atual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register("currentPassword")} />
      <TextField label="Nova senha" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...form.register("newPassword")} />
      <TextField label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmNewPassword?.message} {...form.register("confirmNewPassword")} />
      <FormError message={errors.root?.server?.message} />
      {saved && (
        <p role="status" className="text-sm text-success">
          Senha alterada.
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="self-start">
        Alterar senha
      </Button>
    </form>
  );
}

export function ProfilePage({ userId }: { userId: string }): JSX.Element {
  const me = useQuery(meQuery(userId));
  const wallets = useQuery(walletsQuery(userId));

  if (me.isPending) {
    return (
      <AccountLayout title="Perfil do colecionador">
        <div aria-busy="true" className="grid gap-6 sm:grid-cols-2">
          <p className="sr-only">Carregando o perfil...</p>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton h-16 w-full" />
          ))}
        </div>
      </AccountLayout>
    );
  }
  if (me.isError) {
    return (
      <AccountLayout title="Perfil do colecionador">
        <div className="flex flex-col items-start gap-3 bg-surface-card p-6">
          <p role="alert">Não foi possível carregar o perfil.</p>
          <Button onClick={() => void me.refetch()}>Tentar de novo</Button>
        </div>
      </AccountLayout>
    );
  }

  const primaryWallet: PrimaryWalletState = {
    label: wallets.data?.find((wallet) => wallet.role === "primary")?.label ?? "",
    isError: wallets.isError,
    onRetry: () => void wallets.refetch(),
  };

  return (
    <AccountLayout title="Perfil do colecionador">
      <ProfileForm key={me.data.id} user={me.data} primaryWallet={primaryWallet} avatar={<AvatarField user={me.data} />} />
      <PasswordForm />
    </AccountLayout>
  );
}
