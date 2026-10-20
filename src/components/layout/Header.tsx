import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { JSX } from "react";
import { LoginIcon, SearchIcon } from "@/components/icons/KurioIcons";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLogoutMutation } from "@/features/auth/queries";
import { CartLink } from "@/features/cart/components/CartLink";
import { useSession } from "@/lib/session/instance";
import { cn } from "@/lib/utils";

type Section = "home" | "market" | "account" | "other";

const MARKET_PREFIXES = ["/nft/", "/cart", "/checkout", "/orders/"];

function getSection(pathname: string, hash: string): Section {
  if (pathname === "/" && hash.replace("#", "") === "mercado") return "market";
  if (pathname === "/" || pathname === "/login" || pathname === "/register") return "home";
  if (MARKET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "market";
  if (pathname.startsWith("/account/")) return "account";
  return "other";
}

const EXACT = { exact: true, includeHash: true } as const;

const NAV_ITEM =
  "relative flex h-12 shrink-0 items-center text-base whitespace-nowrap hover:text-text-accent aria-[current=page]:font-bold aria-[current=page]:text-text-accent aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-0 aria-[current=page]:after:h-0.75 aria-[current=page]:after:bg-primary lg:h-auto lg:pb-6";

export function Header(): JSX.Element {
  const session = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogoutMutation();
  const section = getSection(location.pathname, location.hash);
  const isAuthenticated = session.status === "authenticated";

  async function handleLogout(): Promise<void> {
    await logout.mutateAsync();
    await navigate({ to: "/" });
  }

  function current(target: Section | "profile" | "wallets"): "page" | undefined {
    if (target === "profile") return location.pathname === "/account/profile" ? "page" : undefined;
    if (target === "wallets") return location.pathname === "/account/wallets" ? "page" : undefined;
    return section === target ? "page" : undefined;
  }

  return (
    <header className={cn("mx-auto w-full max-w-300 border-b-[0.3px] border-primary px-4", section === "market" && "border-transparent")}>
      <nav aria-label="Principal" className="flex flex-wrap items-center gap-x-4 pt-4 lg:flex-nowrap lg:items-start lg:justify-between lg:pt-6">
        <Link to="/" activeOptions={EXACT} className="flex h-10 w-40 items-center text-sm font-bold tracking-brand lg:h-auto lg:pt-2">
          KURIO
        </Link>
        <ul className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-6 overflow-x-auto px-4 lg:order-none lg:mx-0 lg:w-auto lg:gap-8 lg:overflow-visible lg:px-0 xl:gap-10">
          <li>
            <Link to="/" aria-current={current("home")} activeOptions={EXACT} className={NAV_ITEM}>
              Início
            </Link>
          </li>
          <li>
            <Link to="/" hash="mercado" aria-current={current("market")} activeOptions={EXACT} className={NAV_ITEM}>
              Mercado
            </Link>
          </li>
          <li>
            <Link to="/unavailable" search={{ from: "criadores" }} activeOptions={EXACT} className={NAV_ITEM}>
              Criadores
            </Link>
          </li>
          <li>
            <Link to="/unavailable" search={{ from: "aprenda" }} activeOptions={EXACT} className={NAV_ITEM}>
              Aprenda
            </Link>
          </li>
          {isAuthenticated && (
            <>
              <li>
                <Link to="/account/profile" aria-current={current("profile")} activeOptions={EXACT} className={NAV_ITEM}>
                  Perfil
                </Link>
              </li>
              <li>
                <Link to="/account/wallets" aria-current={current("wallets")} activeOptions={EXACT} className={NAV_ITEM}>
                  Carteiras
                </Link>
              </li>
            </>
          )}
        </ul>
        <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:gap-5">
          <Link
            to="/"
            hash="catalog-search"
            activeOptions={EXACT}
            aria-label="Ir para a busca"
            className="hidden size-10 items-center justify-center rounded-md hover:text-text-accent md:inline-flex"
          >
            <SearchIcon className="size-5" />
          </Link>
          <CartLink className="hidden md:inline-flex" />
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={() => void handleLogout()}>
              Sair
            </Button>
          ) : (
            <Link
              to="/login"
              search={{ redirect: location.href }}
              className={cn(buttonVariants({ size: "sm" }), "h-9 px-3 text-base font-medium")}
            >
              <LoginIcon className="size-5" />
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
