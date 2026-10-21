import { zodResolver } from "@hookform/resolvers/zod";
import type { JSX } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { FormError, TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import { registerBodySchema } from "@/contracts/user";
import { applyApiError } from "@/lib/forms";
import { useRegisterMutation } from "../queries";
import { AuthDialog } from "./AuthDialog";

const registerFormSchema = registerBodySchema
  .extend({ confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não conferem.",
    path: ["confirmPassword"],
  });

type RegisterFormInput = z.input<typeof registerFormSchema>;
type RegisterFormOutput = z.output<typeof registerFormSchema>;

type RegisterDialogProps = { open: boolean; onClose: () => void; onDone: () => Promise<void> };

export function RegisterDialog({ open, onClose, onDone }: RegisterDialogProps): JSX.Element {
  return (
    <AuthDialog mode="register" open={open} onClose={onClose} description="Crie seu perfil de colecionador e conecte uma carteira quando quiser.">
      <RegisterForm onDone={onDone} />
    </AuthDialog>
  );
}

function RegisterForm({ onDone }: { onDone: () => Promise<void> }): JSX.Element {
  const register = useRegisterMutation();
  const form = useForm<RegisterFormInput, unknown, RegisterFormOutput>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function handleSubmit({ username, email, password }: RegisterFormOutput): Promise<void> {
    try {
      await register.mutateAsync({ username, email, password });
      await onDone();
    } catch (error) {
      applyApiError(error, form.setError, ["username", "email", "password"]);
    }
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={(event) => void form.handleSubmit(handleSubmit)(event)}>
      <TextField
        label="Nome de usuário"
        isLabelHidden
        placeholder="Nome de usuário"
        autoComplete="off"
        error={errors.username?.message}
        {...form.register("username")}
      />
      <TextField
        label="E-mail"
        isLabelHidden
        placeholder="Digite seu e-mail"
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...form.register("password")}
      />
      <TextField
        label="Confirmar senha"
        isLabelHidden
        placeholder="Confirmar senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...form.register("confirmPassword")}
      />
      <FormError message={errors.root?.server?.message} />
      <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting} className="mt-2 w-full max-sm:h-15">
        Criar conta
      </Button>
    </form>
  );
}
