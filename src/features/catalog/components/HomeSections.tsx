import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { JSX } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
