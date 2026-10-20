import { Link } from "@tanstack/react-router";
import { ArrowRight, Flame, Plus } from "lucide-react";
import type { JSX } from "react";
import { CartIcon } from "@/components/icons/KurioIcons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDE_FRAME = "absolute top-[30%] aspect-3/4 w-[22%] overflow-hidden rounded-md border-4 border-surface-raised shadow-lg";

function EmptyGallery(): JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-5/4 w-full max-w-110 overflow-hidden rounded-3xl border border-border-strong bg-surface-card"
    >
      <div
        className="absolute top-0 left-1/2 h-full w-3/4 -translate-x-1/2 origin-top bg-linear-to-b from-text-accent/30 via-primary/10 to-transparent motion-safe:animate-spotlight"
        style={{ clipPath: "polygon(44% 0, 56% 0, 100% 100%, 0 100%)" }}
      />
      <span className="absolute top-0 left-1/2 h-3 w-16 -translate-x-1/2 rounded-b-full bg-primary shadow-md" />
      <div className={cn(SIDE_FRAME, "left-[5%] -rotate-3")}>
        <img src="/images/nfts/emerald-ape.webp" alt="" width={640} height={640} className="size-full object-cover opacity-25 grayscale" />
      </div>
      <div className={cn(SIDE_FRAME, "right-[5%] rotate-3")}>
        <img src="/images/nfts/golden-beat.webp" alt="" width={640} height={640} className="size-full object-cover opacity-25 grayscale" />
      </div>
      <div className="absolute top-[14%] left-1/2 flex aspect-square w-[40%] -translate-x-1/2 items-center justify-center rounded-xl border-2 border-dashed border-primary bg-ink/60">
        <span className="flex size-12 items-center justify-center rounded-full border border-primary text-primary motion-safe:animate-pulse">
          <Plus className="size-6" />
        </span>
      </div>
      <div className="absolute bottom-[9%] left-1/2 flex w-max -translate-x-1/2 flex-col gap-0.5 rounded-md border border-border-soft bg-surface-raised px-3 py-2 text-tiny leading-tight shadow-md">
        <span className="font-bold text-foreground">Sua primeira obra, 2026</span>
        <span className="text-text-secondary">Técnica: um clique em Comprar</span>
        <span className="text-text-accent">Valor: 0 ETH</span>
      </div>
      <span className="absolute top-[8%] right-[7%] flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg motion-safe:animate-bounce">
        <CartIcon className="size-5" />
        <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-surface-card bg-ink text-tiny font-bold text-text-accent">
          0
        </span>
      </span>
    </div>
  );
}

export function EmptyCart(): JSX.Element {
  return (
    <section
      aria-labelledby="empty-cart-title"
      className="grid items-center gap-10 overflow-x-clip py-4 md:grid-cols-[1fr_minmax(0,25rem)] md:py-8 lg:gap-20"
    >
      <div className="flex flex-col items-start gap-6">
        <p className="flex items-center gap-2 rounded-full border border-border-soft bg-surface-card px-3 py-1.5 text-sm font-bold text-text-accent">
          <CartIcon aria-hidden="true" className="size-4" />
          Seu carrinho está vazio.
        </p>
        <div className="flex flex-col gap-3">
          <h2 id="empty-cart-title" className="text-2xl leading-tight font-bold md:text-3xl lg:text-4xl">
            Uma parede inteira <span className="block text-text-accent">esperando a primeira obra.</span>
          </h2>
          <p className="max-w-130 text-sm leading-6 text-text-secondary md:text-base md:leading-7">
            Toda coleção começa com um quadro. Passeie pelo mercado, escolha a peça que conversa com você e ela aparece aqui, pronta
            para ganhar moldura.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/" hash="mercado" className={cn(buttonVariants(), "gap-2")}>
            Explorar o mercado
            <ArrowRight aria-hidden="true" />
          </Link>
          <Link to="/" search={{ view: "trending" }} hash="mercado" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
            <Flame aria-hidden="true" />
            Ver o que está em alta
          </Link>
        </div>
      </div>
      <EmptyGallery />
    </section>
  );
}
