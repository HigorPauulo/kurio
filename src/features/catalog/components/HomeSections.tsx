import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { JSX } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HERO_IMAGE = "/images/nfts/emerald-ape.webp";

const PROMOS = [
  {
    title: "Lançamentos gênesis de edição limitada",
    text: "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
    image: "/images/nfts/emerald-ape.webp",
    from: "lancamentos-genesis",
  },
  {
    title: "Arte digital selecionada e muito mais",
    text: "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
    image: "/images/nfts/ivory-baron.webp",
    from: "arte-selecionada",
  },
];

const POSTS = [
  {
    date: "12 de setembro",
    reading: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    text: "Aprenda a colecionar, negociar e verificar ativos digitais.",
    image: "/images/nfts/ivory-baron.webp",
    from: "diario-propriedade",
  },
  {
    date: "13 de setembro",
    reading: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    text: "Conheça criadores que moldam a cultura digital.",
    image: "/images/nfts/emerald-ape.webp",
    from: "diario-artistas",
  },
  {
    date: "15 de setembro",
    reading: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    text: "Entenda raridade, procedência, direitos autorais e utilidade.",
    image: "/images/nfts/sage-nomad.webp",
    from: "diario-raridade",
  },
  {
    date: "15 de setembro",
    reading: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    text: "Proteja sua carteira, seus ativos e sua identidade.",
    image: "/images/nfts/golden-beat.webp",
    from: "diario-carteira",
  },
];

export function HomeHero(): JSX.Element {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br from-surface-dark to-surface-raised p-4 md:rounded-none md:bg-none md:p-0 md:pl-10 lg:h-112.5"
    >
      <div className="flex min-w-0 flex-1 flex-col items-start gap-3 md:gap-8">
        <div className="flex flex-col gap-1 md:gap-2">
          <p className="text-2xs leading-4 font-medium md:text-sm md:tracking-brand">Bem-vindo à Kurio</p>
          <h1
            id="hero-title"
            className="text-base leading-7 font-bold uppercase md:text-3xl md:leading-12 lg:max-w-150 lg:text-display lg:leading-17.5"
          >
            Seja dono do futuro <br className="hidden lg:block" />
            da arte digital
          </h1>
          <p className="line-clamp-3 max-w-139 text-2xs leading-4 text-text-secondary md:line-clamp-none md:text-sm md:leading-6">
            Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e
            tenha uma parte da cultura da internet.
          </p>
        </div>
        <Link
          to="/"
          hash="mercado"
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-auto gap-1 px-0 text-2xs font-bold text-text-accent uppercase md:h-10 md:w-35 md:rounded-md md:bg-primary md:text-base md:text-primary-foreground md:no-underline md:hover:bg-text-accent",
          )}
        >
          Explorar
          <ArrowRight aria-hidden="true" className="md:hidden" />
        </Link>
      </div>
      <img
        src={HERO_IMAGE}
        alt="Emerald Ape #042, macaco de óculos e jaqueta verde"
        width={640}
        height={640}
        fetchPriority="high"
        className="aspect-square w-32 shrink-0 rounded-2xl object-cover md:w-72 md:rounded-3xl lg:w-112.5"
      />
    </section>
  );
}

function Promos(): JSX.Element {
  return (
    <section aria-label="Lançamentos" className="grid gap-8 md:grid-cols-2">
      {PROMOS.map((promo) => (
        <article key={promo.from} className="flex overflow-hidden bg-surface-card">
          <img
            src={promo.image}
            alt=""
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            className="aspect-square w-2/5 max-w-50 shrink-0 object-cover"
          />
          <div className="flex flex-1 flex-col items-end justify-center gap-3 p-4 text-right">
            <h2 className="text-base leading-5 font-bold">{promo.title}</h2>
            <p className="text-xs leading-5 text-text-secondary">{promo.text}</p>
            <Link
              to="/unavailable"
              search={{ from: promo.from }}
              aria-label={`Explorar: ${promo.title}`}
              className={cn(buttonVariants({ size: "sm" }), "gap-1 font-medium")}
            >
              Explorar
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
        </article>
      ))}
    </section>
  );
}

function Journal(): JSX.Element {
  return (
    <section aria-labelledby="journal-title" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 id="journal-title" className="text-2xl font-bold">
          Diário da Cunhagem
        </h2>
        <p className="text-caption text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </div>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.from}>
            <article className="relative flex h-full flex-col overflow-hidden rounded-md bg-surface-card focus-within:ring-3 focus-within:ring-ring/60">
              <img
                src={post.image}
                alt=""
                width={640}
                height={640}
                loading="lazy"
                decoding="async"
                className="aspect-186/135 w-full object-cover"
              />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <p className="text-2xs text-text-secondary">
                  {post.date} <span aria-hidden="true">|</span> {post.reading}
                </p>
                <h3 className="text-sm leading-5 font-bold">{post.title}</h3>
                <p className="text-xs leading-5 text-text-secondary">{post.text}</p>
                <Link
                  to="/unavailable"
                  search={{ from: post.from }}
                  className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-text-accent outline-none after:absolute after:inset-0"
                >
                  Ler mais
                  <ArrowRight aria-hidden="true" className="size-3" />
                  <span className="sr-only">: {post.title}</span>
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeEditorial(): JSX.Element {
  return (
    <>
      <Promos />
      <Journal />
    </>
  );
}
