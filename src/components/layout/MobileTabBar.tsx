import { Link } from "@tanstack/react-router";
import { Heart, House, UserRound } from "lucide-react";
import type { JSX } from "react";
import { CartLink } from "@/features/cart/components/CartLink";

const TAB = "inline-flex size-11 items-center justify-center rounded-full text-foreground hover:text-text-accent aria-[current=page]:text-text-accent";

export function MobileTabBar(): JSX.Element {
  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-border-strong bg-surface-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        <li>
          <Link to="/" aria-label="Início" activeOptions={{ exact: true }} className={TAB}>
            <House aria-hidden="true" className="size-6" />
          </Link>
        </li>
        <li>
          <Link to="/unavailable" search={{ from: "lista-de-interesse" }} aria-label="Lista de interesse" className={TAB}>
            <Heart aria-hidden="true" className="size-6" />
          </Link>
        </li>
        <li>
          <CartLink className={TAB} />
        </li>
        <li>
          <Link to="/account/profile" aria-label="Minha conta" className={TAB}>
            <UserRound aria-hidden="true" className="size-6" />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
