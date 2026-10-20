import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession } from "@/lib/session/instance";
import { useLogoutMutation } from "../queries";

export function ExpiredSessionDialog(): JSX.Element | null {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogoutMutation();
  const { auth } = useSearch({ from: "__root__" });

  if (session.status !== "expired" || auth) return null;

  async function handleLeave(): Promise<void> {
    await logout.mutateAsync();
    await navigate({ to: "/" });
  }

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Sua sessão expirou</DialogTitle>
          <DialogDescription>Entre de novo para continuar de onde parou.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => void handleLeave()}>
            Sair
          </Button>
          <Button onClick={() => void navigate({ to: "/login", search: { redirect: location.href } })}>
            Entrar de novo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
