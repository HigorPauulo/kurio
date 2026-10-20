import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { useLogoutMutation } from "@/features/auth/queries";
import { CartLink } from "@/features/cart/components/CartLink";
import { useSession } from "@/lib/session/instance";

export function Header(): JSX.Element {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogoutMutation();

  async function handleLogout(): Promise<void> {
    await logout.mutateAsync();
    await navigate({ to: "/" });
  }

  return (
    <header className="border-b">
      <nav aria-label="Principal" className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 p-4">
        <Link to="/" className="font-semibold tracking-widest">
          KURIO
        </Link>
        <Link to="/">Início</Link>
        <Link to="/unavailable" search={{ from: "criadores" }}>
          Criadores
        </Link>
        <Link to="/unavailable" search={{ from: "aprenda" }}>
          Aprenda
        </Link>
        {session.status === "authenticated" ? (
          <>
            <Link to="/account/profile">Perfil</Link>
            <Link to="/account/wallets">Carteiras</Link>
            <span className="ml-auto">
              <CartLink />
            </span>
            <Button variant="outline" onClick={() => void handleLogout()}>
              Sair
            </Button>
          </>
        ) : (
          <>
            <span className="ml-auto">
              <CartLink />
            </span>
            <Link to="/login" search={{ redirect: location.href }}>
              Entrar
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
