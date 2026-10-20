import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState, type JSX } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormError, TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { chainSchema } from "@/contracts/common";
import type { User } from "@/contracts/user";
import {
  createWalletBodySchema,
  walletProviderSchema,
  type Wallet,
} from "@/contracts/wallet";
import { applyApiError } from "@/lib/forms";
import { meQuery, useSaveWalletMutation, walletsQuery } from "../queries";
import { AccountLayout } from "./AccountLayout";

const walletFormSchema = createWalletBodySchema.omit({ role: true });
type WalletFormInput = z.input<typeof walletFormSchema>;
type WalletFormOutput = z.output<typeof walletFormSchema>;

const NETWORK_LABELS: Record<z.infer<typeof chainSchema>, string> = {
  ethereum: "Ethereum",
  polygon: "Polygon",
  base: "Base",
};

const PROVIDER_LABELS: Record<z.infer<typeof walletProviderSchema>, string> = {
  metamask: "MetaMask",
  walletconnect: "WalletConnect",
  coinbase: "Coinbase Wallet",
};

const WALLET_FIELDS = [
  "label",
  "provider",
  "address",
  "backupAddress",
  "networks",
  "profileName",
  "referralCode",
] as const;

type WalletFormProps = {
  role: Wallet["role"];
  title: string;
  wallet: Wallet | undefined;
  user: User;
};

function WalletForm({ role, title, wallet, user }: WalletFormProps): JSX.Element {
  const save = useSaveWalletMutation(user.id);
  const [saved, setSaved] = useState(false);
  const [createdId, setCreatedId] = useState<string>();
  const form = useForm<WalletFormInput, unknown, WalletFormOutput>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: {
      label: wallet?.label ?? "",
      provider: wallet?.provider ?? "metamask",
      address: wallet?.address ?? "",
      backupAddress: wallet?.backupAddress ?? "",
      networks: wallet?.networks ?? [],
      profileName: wallet?.profileName ?? "",
      referralCode: wallet?.referralCode ?? "",
    },
  });
  const { errors, isSubmitting } = form.formState;

  async function handleSubmit(values: WalletFormOutput): Promise<void> {
    setSaved(false);
    try {
      const result = await save.mutateAsync({ walletId: wallet?.id ?? createdId, body: { ...values, role } });
      setCreatedId(result.id);
      setSaved(true);
    } catch (error) {
      applyApiError(error, form.setError, WALLET_FIELDS);
    }
  }

  const headingId = `wallet-${role}-title`;

  return (
    <form
      noValidate
      aria-labelledby={headingId}
      className="flex flex-col gap-6"
      onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
    >
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="text-lg font-bold">
          {title}
        </h2>
        {role === "primary" && (
          <p className="text-sm text-text-secondary">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        )}
      </div>
      <div className="grid gap-x-7 gap-y-6 sm:grid-cols-2">
        <TextField label="Nome de exibição" value={user.name} readOnly required editIn={{ to: "/account/profile", label: "Editar no Perfil" }} />
        <TextField label="Apelido da carteira" required error={errors.label?.message} {...form.register("label")} />
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 flex items-center gap-1 text-body leading-4">
            Rede
            <span aria-hidden="true" className="text-lg leading-none text-destructive">
              *
            </span>
          </legend>
          <div className="flex min-h-10 flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-input px-3 py-2">
            {chainSchema.options.map((network) => (
              <label key={network} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="size-4 accent-primary" value={network} {...form.register("networks")} />
                {NETWORK_LABELS[network]}
              </label>
            ))}
          </div>
          {errors.networks && <p className="text-sm text-destructive">{errors.networks.message}</p>}
        </fieldset>
        <TextField label="Nome do perfil" required error={errors.profileName?.message} {...form.register("profileName")} />
        <TextField
          label="Endereço da carteira"
          placeholder="Endereço 0x da carteira"
          autoComplete="off"
          required
          error={errors.address?.message}
          {...form.register("address")}
        />
        <TextField
          label="ENS ou carteira secundária"
          placeholder="ENS ou carteira secundária (opcional)"
          autoComplete="off"
          error={errors.backupAddress?.message}
          {...form.register("backupAddress")}
        />
        <div className="flex flex-col gap-2">
          <label htmlFor={`${role}-provider`} className="flex items-center gap-1 text-body leading-4">
            Tipo de carteira
            <span aria-hidden="true" className="text-lg leading-none text-destructive">
              *
            </span>
          </label>
          <NativeSelect id={`${role}-provider`} required {...form.register("provider")}>
            {walletProviderSchema.options.map((provider) => (
              <option key={provider} value={provider}>
                {PROVIDER_LABELS[provider]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <TextField label="Código de indicação" autoComplete="off" required error={errors.referralCode?.message} {...form.register("referralCode")} />
        <TextField label="E-mail" value={user.email} readOnly required editIn={{ to: "/account/profile", label: "Editar no Perfil" }} />
        <TextField label="Nome ENS" value={user.ensName ?? ""} readOnly required editIn={{ to: "/account/profile", label: "Editar no Perfil" }} />
      </div>
      <FormError message={errors.root?.server?.message} />
      {saved && (
        <p role="status" className="text-sm text-success">
          Carteira salva.
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting} className="self-start">
        Salvar carteira
      </Button>
    </form>
  );
}

export function WalletsPage({ userId }: { userId: string }): JSX.Element {
  const me = useQuery(meQuery(userId));
  const wallets = useQuery(walletsQuery(userId));
  const [addingSecondary, setAddingSecondary] = useState(false);

  if (me.isPending || wallets.isPending) {
    return (
      <AccountLayout title="Carteiras">
        <div aria-busy="true" className="grid gap-6 sm:grid-cols-2">
          <p className="sr-only">Carregando as carteiras...</p>
          {Array.from({ length: 10 }, (_, index) => (
            <div key={index} className="skeleton h-16 w-full" />
          ))}
        </div>
      </AccountLayout>
    );
  }
  if (me.isError || wallets.isError) {
    return (
      <AccountLayout title="Carteiras">
        <div className="flex flex-col items-start gap-3 bg-surface-card p-6">
          <p role="alert">Não foi possível carregar as carteiras.</p>
          <Button onClick={() => void Promise.all([me.refetch(), wallets.refetch()])}>Tentar de novo</Button>
        </div>
      </AccountLayout>
    );
  }

  const primary = wallets.data.find((wallet) => wallet.role === "primary");
  const secondary = wallets.data.find((wallet) => wallet.role === "secondary");

  return (
    <AccountLayout title="Carteiras">
      <WalletForm key={`${me.data.id}-primary`} role="primary" title="Carteira principal" wallet={primary} user={me.data} />
      {secondary || addingSecondary ? (
        <WalletForm key={`${me.data.id}-secondary`} role="secondary" title="Carteira secundária" wallet={secondary} user={me.data} />
      ) : (
        <section className="flex flex-wrap items-start justify-between gap-3" aria-labelledby="secondary-empty">
          <div className="flex flex-col gap-1">
            <h2 id="secondary-empty" className="text-lg font-bold">
              Carteira secundária
            </h2>
            <p className="text-sm text-text-secondary">Você ainda não adicionou uma carteira secundária.</p>
          </div>
          <Button variant="link" className="px-0 text-lg font-bold" onClick={() => setAddingSecondary(true)}>
            Adicionar
          </Button>
        </section>
      )}
    </AccountLayout>
  );
}
