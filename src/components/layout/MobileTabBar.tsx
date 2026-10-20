import { Link } from "@tanstack/react-router";
import type { JSX } from "react";
import { HeartFilledIcon, HomeFilledIcon, ShopFilledIcon, UserFilledIcon } from "@/components/icons/KurioIcons";
import { CartLink } from "@/features/cart/components/CartLink";

const TAB =
  "relative inline-flex size-11 items-center justify-center rounded-full text-text-secondary hover:text-text-accent [&>svg]:size-5 aria-[current=page]:text-text-accent aria-[current=page]:after:absolute aria-[current=page]:after:bottom-0 aria-[current=page]:after:size-1.5 aria-[current=page]:after:rounded-full aria-[current=page]:after:bg-primary";

export function MobileTabBar(): JSX.Element {
  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl border-t border-border-strong bg-surface-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
        <li>
          <Link to="/" aria-label="Início" activeOptions={{ exact: true }} className={TAB}>
            <HomeFilledIcon />
          </Link>
        </li>
        <li>
          <Link to="/unavailable" search={{ from: "lista-de-interesse" }} aria-label="Lista de interesse" className={TAB}>
            <HeartFilledIcon />
          </Link>
        </li>
        <li>
          <CartLink className={TAB} icon={ShopFilledIcon} />
        </li>
        <li>
          <Link to="/account/profile" aria-label="Minha conta" className={TAB}>
            <UserFilledIcon />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
