import { Link, useNavigate } from "@tanstack/react-router";
import { useId, type FormEvent, type JSX } from "react";
import type { Category } from "@/contracts/common";

const FEATURES = [
  {
    initial: "W",
    title: "Segurança da carteira",
    text: "Proteja sua carteira e colecione arte digital verificada com confiança.",
  },
  {
    initial: "C",
    title: "Criadores em destaque",
    text: "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
  },
  {
    initial: "D",
    title: "Alertas de lançamentos",
    text: "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
  },
];

const PROFILE_LINKS = [
  { label: "Minha coleção", from: "colecao" },
  { label: "Atividade", from: "atividade" },
  { label: "Estúdio do criador", from: "estudio" },
  { label: "Lista de interesse", from: "lista-de-interesse" },
];

const HELP_LINKS = [
  { label: "Central de ajuda", from: "ajuda" },
  { label: "Como comprar NFTs", from: "como-comprar" },
  { label: "Carteira e segurança", from: "seguranca" },
  { label: "Política do mercado", from: "politica" },
  { label: "Denunciar item", from: "denunciar" },
];

const COLLECTION_LINKS: { label: string; category: Category }[] = [
  { label: "Arte digital", category: "digital-art" },
  { label: "Fotografia", category: "photography" },
  { label: "Música", category: "music" },
  { label: "Arte 3D", category: "3d-art" },
  { label: "Utilidade", category: "utility" },
];

const SOCIAL_LINKS = [
  { label: "Facebook", icon: "/images/social/facebook.svg" },
  { label: "Instagram", icon: "/images/social/instagram.svg" },
  { label: "Twitter", icon: "/images/social/twitter.svg" },
  { label: "LinkedIn", icon: "/images/social/linkedin.svg" },
  { label: "YouTube", icon: "/images/social/youtube.svg" },
];

const LINK = "leading-[1.875rem] hover:text-text-accent";
const COLUMN_TITLE = "text-lg leading-4 font-bold";

function Newsletter(): JSX.Element {
  const navigate = useNavigate();
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void navigate({ to: "/unavailable", search: { from: "newsletter" } });
  }

  return (
    <form aria-labelledby={`${inputId}-title`} className="flex flex-col gap-3 md:px-4" onSubmit={handleSubmit}>
      <h2 id={`${inputId}-title`} className={COLUMN_TITLE}>
        Antecipe-se ao próximo lançamento
      </h2>
      <div className="mt-1 flex h-10 overflow-hidden rounded-md border border-input bg-surface-dark">
        <label htmlFor={inputId} className="sr-only">
          Endereço para receber lançamentos
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="off"
          placeholder="digite seu e-mail..."
          className="min-w-0 flex-1 bg-transparent px-3 text-base placeholder:text-secondary-base focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary md:text-sm"
        />
        <button type="submit" className="bg-primary px-4 text-lg font-bold text-primary-foreground hover:bg-text-accent">
          Enviar
        </button>
      </div>
      <p className="text-caption leading-[1.375rem] text-text-secondary">
        Receba lançamentos selecionados, histórias de criadores e novidades do mercado.
      </p>
    </form>
  );
}

export function Footer(): JSX.Element {
  return (
    <footer className="mx-auto mt-12 w-full max-w-300 px-page md:mt-24">
      <div className="grid grid-cols-1 gap-8 bg-surface-card p-8 md:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.35fr] lg:gap-0">
        {FEATURES.map((feature) => (
          <div key={feature.initial} className="flex flex-col gap-3 lg:border-r lg:border-primary lg:px-4">
            <span
              aria-hidden="true"
              className="flex size-18.5 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground"
            >
              {feature.initial}
            </span>
            <h2 className="text-md leading-4 font-bold">{feature.title}</h2>
            <p className="max-w-51 text-sm leading-[1.375rem] text-text-secondary">{feature.text}</p>
          </div>
        ))}
        <Newsletter />
      </div>
      <div className="grid gap-4 bg-surface-dark px-8 py-6 text-sm leading-[1.375rem] sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_14.25rem] lg:items-center lg:gap-16">
        <p className="font-bold tracking-brand">KURIO</p>
        <p>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </p>
        <a href="mailto:contato@email.com" className="hover:text-text-accent">
          contato@email.com
        </a>
        <p>+55 11 4002 8922</p>
      </div>
      <div className="grid grid-cols-1 gap-10 bg-surface-card p-8 text-sm sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_14.25rem] lg:gap-16">
        <div className="flex flex-col gap-2">
          <h2 className={COLUMN_TITLE}>
            Meu perfil
          </h2>
          <ul>
            <li>
              <Link to="/account/profile" className={LINK}>
                Meu perfil
              </Link>
            </li>
            {PROFILE_LINKS.map((link) => (
              <li key={link.from}>
                <Link to="/unavailable" search={{ from: link.from }} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className={COLUMN_TITLE}>
            Central de ajuda
          </h2>
          <ul>
            {HELP_LINKS.map((link) => (
              <li key={link.from}>
                <Link to="/unavailable" search={{ from: link.from }} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className={COLUMN_TITLE}>
            Coleções
          </h2>
          <ul>
            {COLLECTION_LINKS.map((link) => (
              <li key={link.category}>
                <Link to="/" hash="mercado" search={{ category: link.category }} className={LINK}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-5">
            <h2 className={COLUMN_TITLE}>
              Redes sociais
            </h2>
            <ul className="flex gap-2.5">
              {SOCIAL_LINKS.map((social) => (
                <li key={social.label}>
                  <Link
                    to="/unavailable"
                    search={{ from: social.label.toLowerCase() }}
                    aria-label={social.label}
                    className="block rounded-md hover:opacity-80"
                  >
                    <img src={social.icon} alt="" width={32} height={32} className="size-8" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className={COLUMN_TITLE}>
              Carteiras compatíveis
            </h2>
            <p className="flex h-6.5 items-center justify-center rounded-md border border-border-soft bg-surface-dark px-2 text-tiny font-bold tracking-[0.1px] whitespace-pre text-text-accent">
              {"METAMASK  •  WALLETCONNECT  •  COINBASE"}
            </p>
          </div>
        </div>
      </div>
      <p className="py-1.5 text-center text-sm leading-[1.875rem]">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  );
}
