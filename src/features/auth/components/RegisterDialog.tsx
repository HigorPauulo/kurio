import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormError, TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { registerBodySchema } from "@/contracts/user";
import { applyApiError } from "@/lib/forms";
import { getDismissTarget } from "@/lib/session/guards";
import { safeRedirect } from "@/lib/url/safeRedirect";
import { useRegisterMutation } from "../queries";

const registerFormSchema = registerBodySchema
  .extend({ confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

type RegisterFormInput = z.input<typeof registerFormSchema>;
type RegisterFormOutput = z.output<typeof registerFormSchema>;

export function RegisterDialog({ redirect }: { redirect?: string }): JSX.Element {
  const navigate = useNavigate();
  const register = useRegisterMutation();
  const form = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const destination = safeRedirect(redirect);

  async function handleSubmit({ username, email, password }: RegisterFormOutput): Promise<void> {
    try {
      await register.mutateAsync({ username, email, password });
      await navigate({ href: destination });
    } catch (error) {
      applyApiError(error, form.setError, ["username", "email", "password"]);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && void navigate({ href: getDismissTarget(redirect) })}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar conta</DialogTitle>
          <DialogDescription>Crie seu perfil de colecionador e conecte uma carteira quando quiser.</DialogDescription>
        </DialogHeader>
        <form noValidate className="flex flex-col gap-4" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
          <TextField
            label="Nome de usuário"
            autoComplete="username"
            error={errors.username?.message}
            {...form.register("username")}
          />
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
            autoComplete="new-password"
            error={errors.password?.message}
            {...form.register("password")}
          />
          <TextField
            label="Confirmar senha"
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...form.register("confirmPassword")}
          />
          <FormError message={errors.root?.server?.message} />
          <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
            Criar conta
          </Button>
        </form>
        <p className="text-sm">
          Já tem conta?{" "}
          <Link to="/login" search={{ redirect }} className="underline underline-offset-4">
            Entrar
          </Link>
        </p>
        <Link to="/unavailable" search={{ from: "login-social" }} className="text-sm underline underline-offset-4">
          Ou continue com
        </Link>
      </DialogContent>
    </Dialog>
  );
}
