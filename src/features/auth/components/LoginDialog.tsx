import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { FormError, TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { loginBodySchema, type LoginBody } from "@/contracts/user";
import { applyApiError } from "@/lib/forms";
import { safeRedirect } from "@/lib/url/safeRedirect";
import { useLoginMutation } from "../queries";

export function LoginDialog({ redirect }: { redirect?: string }): JSX.Element {
  const navigate = useNavigate();
  const login = useLoginMutation();
  const form = useForm<LoginBody>({
    resolver: zodResolver(loginBodySchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const destination = safeRedirect(redirect);

  async function handleSubmit(values: LoginBody): Promise<void> {
    try {
      await login.mutateAsync(values);
      await navigate({ to: destination });
    } catch (error) {
      applyApiError(error, form.setError, ["email", "password"]);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && void navigate({ to: destination })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrar</DialogTitle>
          <DialogDescription>Acesse sua conta de colecionador.</DialogDescription>
        </DialogHeader>
        <form noValidate className="flex flex-col gap-4" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...form.register("email")}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register("password")}
          />
          <FormError message={errors.root?.server?.message} />
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            Entrar
          </Button>
        </form>
        <p className="text-sm">
          Ainda não tem conta?{" "}
          <Link to="/register" search={{ redirect }} className="underline underline-offset-4">
            Criar conta
          </Link>
        </p>
        <Link to="/unavailable" search={{ from: "login-social" }} className="text-sm underline underline-offset-4">
          Ou continue com
        </Link>
      </DialogContent>
    </Dialog>
  );
}
