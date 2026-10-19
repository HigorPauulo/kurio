import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState, type JSX } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { FormError, TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import { chainSchema } from "@/contracts/common";
import type { User } from "@/contracts/user";
import {
  createWalletBodySchema,
  walletProviderSchema,
  type Wallet,
} from "@/contracts/wallet";
import { applyApiError } from "@/lib/forms";
import { meQuery, useSaveWalletMutation, walletsQuery } from "../queries";

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
      className="flex flex-col gap-4 rounded-xl border p-4"
      onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}
    >
      <h2 id={headingId} className="text-lg font-semibold">
        {title}
      </h2>
      <TextField label="Nome de exibição" value={user.name} readOnly editIn={{ to: "/account/profile", label: "Editar no Perfil" }} />
      <TextField label="Apelido da carteira" error={errors.label?.message} {...form.register("label")} />
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">Rede</legend>
        <div className="flex flex-wrap gap-4">
          {chainSchema.options.map((network) => (
            <label key={network} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={network} {...form.register("networks")} />
              {NETWORK_LABELS[network]}
            </label>
          ))}
        </div>
        {errors.networks && <p className="text-sm text-destructive">{errors.networks.message}</p>}
      </fieldset>
      <TextField label="Nome do perfil" error={errors.profileName?.message} {...form.register("profileName")} />
      <TextField label="Endereço da carteira" placeholder="Endereço 0x da carteira" autoComplete="off" error={errors.address?.message} {...form.register("address")} />
      <TextField label="ENS ou carteira secundária (opcional)" autoComplete="off" error={errors.backupAddress?.message} {...form.register("backupAddress")} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${role}-provider`} className="text-sm font-medium">
          Tipo de carteira
        </label>
        <select id={`${role}-provider`} className="h-8 rounded-lg border px-2 text-sm" {...form.register("provider")}>
          {walletProviderSchema.options.map((provider) => (
            <option key={provider} value={provider}>
              {PROVIDER_LABELS[provider]}
            </option>
          ))}
        </select>
      </div>
      <TextField label="Código de indicação" autoComplete="off" error={errors.referralCode?.message} {...form.register("referralCode")} />
      <TextField label="E-mail" value={user.email} readOnly editIn={{ to: "/account/profile", label: "Editar no Perfil" }} />
      <TextField label="Nome ENS" value={user.ensName ?? ""} readOnly editIn={{ to: "/account/profile", label: "Editar no Perfil" }} />
      <FormError message={errors.root?.server?.message} />
      {saved && <p role="status">Carteira salva.</p>}
      <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
        Salvar carteira
      </Button>
    </form>
  );
}

export function WalletsPage({ userId }: { userId: string }): JSX.Element {
  const me = useQuery(meQuery(userId));
  const wallets = useQuery(walletsQuery(userId));
  const [addingSecondary, setAddingSecondary] = useState(false);

  if (me.isPending || wallets.isPending) return <p className="p-6">Carregando as carteiras...</p>;
  if (me.isError || wallets.isError) {
    return (
      <div className="flex flex-col gap-2 p-6">
        <p role="alert">Não foi possível carregar as carteiras.</p>
        <Button onClick={() => void Promise.all([me.refetch(), wallets.refetch()])}>Tentar de novo</Button>
      </div>
    );
  }

  const primary = wallets.data.find((wallet) => wallet.role === "primary");
  const secondary = wallets.data.find((wallet) => wallet.role === "secondary");

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-2xl font-semibold">Carteiras</h1>
      <p className="text-sm text-muted-foreground">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.
      </p>
      <WalletForm key={`${me.data.id}-primary`} role="primary" title="Carteira principal" wallet={primary} user={me.data} />
      {secondary || addingSecondary ? (
        <WalletForm key={`${me.data.id}-secondary`} role="secondary" title="Carteira secundária" wallet={secondary} user={me.data} />
      ) : (
        <section className="flex flex-col gap-2 rounded-xl border p-4" aria-labelledby="secondary-empty">
          <h2 id="secondary-empty" className="text-lg font-semibold">
            Carteira secundária
          </h2>
          <p className="text-sm">Você ainda não adicionou uma carteira secundária.</p>
          <Button variant="outline" onClick={() => setAddingSecondary(true)}>
            Adicionar
          </Button>
        </section>
      )}
    </main>
  );
}
