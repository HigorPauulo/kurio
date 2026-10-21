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
import { useLogout } from "../useLogout";

export function ExpiredSessionDialog(): JSX.Element | null {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isPending: isLoggingOut } = useLogout();
  const { auth } = useSearch({ from: "__root__" });

  if (session.status !== "expired" || auth) return null;

  return (
    <Dialog open>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Sua sessão expirou</DialogTitle>
          <DialogDescription>Entre de novo para continuar de onde parou.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={isLoggingOut} aria-busy={isLoggingOut} onClick={() => void logout()}>
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
