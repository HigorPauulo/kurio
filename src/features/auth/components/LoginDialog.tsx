import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { FormError, TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import { loginBodySchema, type LoginBody } from "@/contracts/user";
import { applyApiError } from "@/lib/forms";
import { useLoginMutation } from "../queries";
import { AuthDialog } from "./AuthDialog";

type LoginDialogProps = { open: boolean; onClose: () => void; onDone: () => Promise<void> };

export function LoginDialog({ open, onClose, onDone }: LoginDialogProps): JSX.Element {
  return (
    <AuthDialog mode="login" open={open} onClose={onClose} description="Entre para gerenciar sua carteira, coleção e perfil de criador.">
      <LoginForm onDone={onDone} />
    </AuthDialog>
  );
}

function LoginForm({ onDone }: { onDone: () => Promise<void> }): JSX.Element {
  const login = useLoginMutation();
  const form = useForm<LoginBody>({
    resolver: zodResolver(loginBodySchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function handleSubmit(values: LoginBody): Promise<void> {
    try {
      await login.mutateAsync(values);
      await onDone();
    } catch (error) {
      applyApiError(error, form.setError, ["email", "password"]);
    }
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
      <TextField
        label="E-mail"
        isLabelHidden
        placeholder="contato@email.com"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <TextField
        label="Senha"
        isLabelHidden
        placeholder="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...form.register("password")}
      />
      <Link to="/unavailable" search={{ from: "esqueci-senha" }} className="self-end text-caption text-text-accent hover:underline">
        Esqueceu a senha?
      </Link>
      <FormError message={errors.root?.server?.message} />
      <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting} className="mt-2 w-full max-sm:h-15">
        Entrar
      </Button>
    </form>
  );
}
