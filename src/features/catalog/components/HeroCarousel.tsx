import { Link } from "@tanstack/react-router";
import { ArrowRight, Pause, Play } from "lucide-react";
import { useEffect, useState, type JSX } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { useSwipe } from "@/lib/useSwipe";
import { cn } from "@/lib/utils";

const ROTATION_MS = 6000;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const SLIDES = [
  {
    kicker: "Bem-vindo à Kurio",
    title: ["Seja dono do futuro", "da arte digital"],
    text: "Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma parte da cultura da internet.",
    image: "/images/nfts/emerald-ape.webp",
    alt: "Macaco de óculos redondos e jaqueta verde",
  },
  {
    kicker: "Edições limitadas",
    title: ["Colecione direto", "dos criadores"],
    text: "Cada NFT tem edições com estoque e limite por pedido próprios, e o valor em ETH é cotado pelo servidor sem arredondar.",
    image: "/images/nfts/sage-nomad.webp",
    alt: "Gorila de chapéu verde e moletom roxo",
  },
  {
    kicker: "Compra segura",
    title: ["Sua carteira,", "sua coleção"],
    text: "Conecte a carteira, revise o pedido e receba o recibo da transação na rede escolhida.",
    image: "/images/nfts/golden-beat.webp",
    alt: "Macaco dourado de fones de ouvido verdes",
  },
];

export function HeroCarousel(): JSX.Element {
  const isReducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const [active, setActive] = useState(0);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const swipe = useSwipe((direction) => goTo(direction));
  const dragOffset = swipe.offset;
  const isRotating = !isPausedByUser && !isHovered && !isFocused && !isReducedMotion && dragOffset === null;

  function goTo(step: number): void {
    setActive((current) => (current + step + SLIDES.length) % SLIDES.length);
  }

  useEffect(() => {
    if (!isRotating) return;
    const timer = setInterval(() => goTo(1), ROTATION_MS);
    return () => clearInterval(timer);
  }, [isRotating]);

  return (
    <section
      aria-roledescription="carrossel"
      aria-labelledby="hero-title"
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-surface-dark to-surface-raised p-4 pb-10 md:rounded-none md:bg-none md:p-0 md:pb-12 md:pl-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
      }}
    >
      <h1 id="hero-title" className="sr-only">
        Kurio, marketplace de arte digital
      </h1>
      <div
        aria-live={isRotating ? "off" : "polite"}
        className={cn("grid touch-pan-y select-none", dragOffset !== null && "cursor-grabbing")}
        {...swipe.handlers}
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === active;
          return (
            <div
              key={slide.image}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} de ${SLIDES.length}`}
              aria-hidden={!isActive}
              inert={!isActive}
              style={isActive && dragOffset ? { transform: `translateX(${dragOffset}px)` } : undefined}
              className={cn(
                "col-start-1 row-start-1 flex cursor-grab items-center gap-4 lg:h-112.5",
                dragOffset === null && "transition-[opacity,transform] duration-700",
                isActive ? "opacity-100" : "opacity-0",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col items-start gap-3 md:gap-8">
                <div className="flex flex-col gap-1 md:gap-2">
                  <p className="text-2xs leading-4 font-medium md:text-sm md:tracking-brand">{slide.kicker}</p>
                  <h2 className="text-base leading-7 font-bold uppercase md:text-3xl md:leading-12 lg:max-w-150 lg:text-display lg:leading-17.5">
                    {slide.title[0]} <br className="hidden lg:block" />
                    {slide.title[1]}
                  </h2>
                  <p className="line-clamp-3 max-w-139 text-2xs leading-4 text-text-secondary md:line-clamp-none md:text-sm md:leading-6">
                    {slide.text}
                  </p>
                </div>
                <Link
                  to="/"
                  hash="mercado"
                  draggable={false}
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
                src={slide.image}
                alt={slide.alt}
                draggable={false}
                width={640}
                height={640}
                fetchPriority={index === 0 ? "high" : "low"}
                className="aspect-square w-32 shrink-0 rounded-2xl object-cover md:w-72 md:rounded-3xl lg:w-112.5"
              />
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1">
        <button
          type="button"
          aria-label={isPausedByUser ? "Retomar o carrossel" : "Pausar o carrossel"}
          onClick={() => setIsPausedByUser((paused) => !paused)}
          className="flex size-6 items-center justify-center rounded-full text-text-accent hover:text-foreground"
        >
          {isPausedByUser ? <Play aria-hidden="true" className="size-3" /> : <Pause aria-hidden="true" className="size-3" />}
        </button>
        {SLIDES.map((slide, index) => (
          <button
            key={slide.image}
            type="button"
            aria-label={`Mostrar o slide ${index + 1} de ${SLIDES.length}`}
            aria-current={index === active ? "true" : undefined}
            onClick={() => setActive(index)}
            className="flex size-6 items-center justify-center rounded-full"
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-2 rounded-full border border-primary transition-all",
                index === active ? "w-5 bg-primary" : "bg-transparent",
              )}
            />
          </button>
        ))}
      </div>
    </section>
  );
}
