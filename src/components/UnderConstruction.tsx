import { Link } from "@tanstack/react-router";
import { ArrowRight, Construction } from "lucide-react";
import type { JSX } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Section = { label: string; note?: string };

const SOCIAL_NOTE = "As redes do Kurio ainda não abriram as portas.";
const ACTION_NOTE = "Nenhum dado foi enviado ou salvo.";

const SECTIONS: Record<string, Section> = {
  criadores: { label: "Criadores" },
  aprenda: { label: "Aprenda" },
  colecao: { label: "Minha coleção" },
  atividade: { label: "Atividade" },
  estudio: { label: "Estúdio do criador" },
  "lista-de-interesse": { label: "Lista de interesse" },
  ofertas: { label: "Ofertas" },
  arquivos: { label: "Arquivos baixados" },
  suporte: { label: "Suporte" },
  ajuda: { label: "Central de ajuda" },
  "como-comprar": { label: "Como comprar NFTs" },
  seguranca: { label: "Carteira e segurança" },
  politica: { label: "Política do mercado" },
  denunciar: { label: "Denunciar item", note: ACTION_NOTE },
  "lancamentos-genesis": { label: "Lançamentos gênesis" },
  "arte-selecionada": { label: "Arte digital selecionada" },
  "diario-propriedade": { label: "Diário da Cunhagem" },
  "diario-artistas": { label: "Diário da Cunhagem" },
  "diario-raridade": { label: "Diário da Cunhagem" },
  "diario-carteira": { label: "Diário da Cunhagem" },
  newsletter: { label: "A newsletter", note: "Seu e-mail não foi enviado nem guardado." },
  "login-google": { label: "Entrar com Google", note: ACTION_NOTE },
  "login-facebook": { label: "Entrar com Facebook", note: ACTION_NOTE },
  "esqueci-senha": { label: "Recuperar a senha", note: ACTION_NOTE },
  facebook: { label: "Nosso Facebook", note: SOCIAL_NOTE },
  instagram: { label: "Nosso Instagram", note: SOCIAL_NOTE },
  twitter: { label: "Nosso Twitter", note: SOCIAL_NOTE },
  linkedin: { label: "Nosso LinkedIn", note: SOCIAL_NOTE },
  youtube: { label: "Nosso YouTube", note: SOCIAL_NOTE },
};

const ARTWORKS = ["/images/nfts/sage-nomad.webp", "/images/nfts/ivory-baron.webp", "/images/nfts/golden-beat.webp"];

function progressFor(key: string): number {
  const sum = [...key].reduce((total, char) => total + char.charCodeAt(0), 0);
  return 35 + (sum % 51);
}

function MintingStack({ progress }: { progress: number }): JSX.Element {
  return (
    <div aria-hidden="true" className="relative mx-auto aspect-square w-full max-w-90">
      <img
        src={ARTWORKS[0]}
        alt=""
        width={640}
        height={640}
        className="absolute inset-[12%] size-[76%] -translate-x-[18%] -rotate-12 rounded-2xl object-cover opacity-40"
      />
      <img
        src={ARTWORKS[1]}
        alt=""
        width={640}
        height={640}
        className="absolute inset-[12%] size-[76%] translate-x-[18%] rotate-9 rounded-2xl object-cover opacity-60"
      />
      <div className="absolute inset-[10%] size-[80%] overflow-hidden rounded-2xl border-2 border-dashed border-primary bg-surface-card">
        <img
          src={ARTWORKS[2]}
          alt=""
          width={640}
          height={640}
          style={{ clipPath: `inset(0 0 ${100 - progress}% 0)` }}
          className="size-full object-cover motion-safe:animate-pulse"
        />
        <span
          className="absolute inset-x-0 h-0.5 bg-text-accent shadow-[0_0_12px_2px] shadow-primary"
          style={{ top: `${progress}%` }}
        />
        <span className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-4 text-display leading-none font-bold text-primary/30">
          ?
        </span>
      </div>
      <span className="absolute -top-1 right-[6%] flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg motion-safe:animate-bounce">
        <Construction className="size-7" />
      </span>
    </div>
  );
}

export function UnderConstruction({ from }: { from: string | undefined }): JSX.Element {
  const key = from ?? "";
  const section = SECTIONS[key] ?? { label: "Esta seção" };
  const progress = progressFor(key || "kurio");

  return (
    <main className="mx-auto grid w-full max-w-300 items-center gap-12 overflow-x-clip px-page pt-10 pb-6 md:grid-cols-[1fr_minmax(0,22.5rem)] md:pt-16 lg:gap-20">
      <div className="flex flex-col items-start gap-6">
        <p className="flex items-center gap-2 overflow-hidden rounded-md bg-[repeating-linear-gradient(135deg,var(--color-primary-base)_0_12px,var(--color-ink)_12px_24px)] p-1">
          <span className="rounded-sm bg-ink px-3 py-1 text-xs font-bold tracking-brand text-text-accent uppercase">
            Em construção
          </span>
        </p>
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl leading-tight font-bold md:text-3xl lg:text-4xl">
            {section.label} <span className="block text-text-accent">em cunhagem.</span>
          </h1>
          <p className="max-w-130 text-sm leading-6 text-text-secondary md:text-base md:leading-7">
            Estamos montando esta parte do Kurio bloco a bloco, como uma edição limitada. Enquanto ela não sai do forno, as obras do
            mercado já estão à venda.
          </p>
          {section.note && (
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <Construction aria-hidden="true" className="size-4 shrink-0" />
              {section.note}
            </p>
          )}
        </div>
        <div className="flex w-full max-w-110 flex-col gap-2">
          <div className="flex justify-between text-xs text-secondary-base">
            <span>Progresso da cunhagem</span>
            <span className="font-bold text-text-accent">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso da cunhagem"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-3 overflow-hidden rounded-full border border-border-soft bg-surface-card"
          >
            <div
              className="h-full rounded-full bg-[repeating-linear-gradient(135deg,var(--color-primary-base)_0_10px,var(--color-text-accent)_10px_20px)] bg-size-[28px_28px] motion-safe:animate-construction"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/" hash="mercado" className={cn(buttonVariants(), "gap-2")}>
            Explorar o mercado
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link to="/" className={buttonVariants({ variant: "outline" })}>
            Voltar ao início
          </Link>
        </div>
      </div>
      <MintingStack progress={progress} />
    </main>
  );
}
