import { Link, useNavigate } from "@tanstack/react-router";
import { Download, Heart, LifeBuoy, LogOut, MapPin, ShoppingCart, Sparkles, UserRound } from "lucide-react";
import type { JSX, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useLogoutMutation } from "../../auth/queries";

const ITEM =
  "flex h-11 items-center gap-3 border-l-4 border-transparent px-4 text-base text-text-accent hover:bg-surface-raised aria-[current=page]:border-primary";

const UNAVAILABLE_ITEMS = [
  { label: "Atividade", from: "atividade", icon: ShoppingCart },
  { label: "Lista de interesse", from: "lista-de-interesse", icon: Heart },
  { label: "Ofertas", from: "ofertas", icon: Sparkles },
  { label: "Arquivos baixados", from: "arquivos", icon: Download },
  { label: "Suporte", from: "suporte", icon: LifeBuoy },
];

function LogoutItem(): JSX.Element {
  const logout = useLogoutMutation();
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    await logout.mutateAsync();
    await navigate({ to: "/" });
  }

  return (
    <button type="button" className={cn(ITEM, "w-full")} onClick={() => void handleLogout()}>
      <LogOut aria-hidden="true" className="size-4.5" />
      Sair
    </button>
  );
}

export function AccountLayout({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <main className="mx-auto grid w-full max-w-300 grid-cols-1 gap-8 px-4 pt-6 md:grid-cols-[15rem_minmax(0,1fr)] lg:grid-cols-[19.375rem_minmax(0,1fr)] lg:gap-7 lg:pt-8">
      <nav aria-label="Conta" className="min-w-0 self-start bg-surface-card py-4">
        <p className="px-2.5 pb-2 text-lg font-bold">Meu perfil</p>
        <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0">
          <li className="shrink-0">
            <Link to="/account/profile" activeOptions={{ exact: true }} className={ITEM}>
              <UserRound aria-hidden="true" className="size-4.5" />
              Dados do perfil
            </Link>
          </li>
          <li className="shrink-0">
            <Link to="/account/wallets" activeOptions={{ exact: true }} className={ITEM}>
              <MapPin aria-hidden="true" className="size-4.5" />
              Carteiras
            </Link>
          </li>
          {UNAVAILABLE_ITEMS.map((item) => (
            <li key={item.from} className="shrink-0">
              <Link to="/unavailable" search={{ from: item.from }} className={ITEM}>
                <item.icon aria-hidden="true" className="size-4.5" />
                {item.label}
              </Link>
            </li>
          ))}
          <li className="shrink-0 md:hidden">
            <LogoutItem />
          </li>
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-10">
        <h1 className="text-lg font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}
