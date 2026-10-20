import { Check, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent, type JSX } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { categorySchema, chainSchema, type Category, type Chain, type EthAmount } from "@/contracts/common";
import type { CatalogFacets } from "@/contracts/nft";
import { compareEth, formatEth, fromEthSteps, toEthSteps } from "@/lib/eth";
import { toggleItem } from "@/lib/list";
import { CATEGORY_LABELS, CHAIN_LABELS } from "../labels";
import { joinParam, splitParam, type CatalogFilters } from "../search";

type ApplyMode = "instant" | "deferred";

type FilterFormProps = {
  filters: CatalogFilters;
  facets: CatalogFacets | undefined;
  mode: ApplyMode;
  onApply: (filters: CatalogFilters) => void;
};

type PriceBounds = { lower: number; upper: number };

const PRICE_STEP = "0.001" as EthAmount;

const LEGEND = "mb-3 text-lg leading-4 font-bold";
const OPTION =
  "group/option relative flex cursor-pointer items-center justify-between gap-2 text-body leading-10 text-text-secondary hover:text-text-accent has-checked:text-text-accent has-focus-visible:rounded-sm has-focus-visible:ring-2 has-focus-visible:ring-ring";
const HIT_AREA = "absolute inset-0 size-full cursor-pointer appearance-none opacity-0";
const CHECK = "hidden size-3.5 group-has-checked/option:block";
const THUMB =
  "pointer-events-none absolute inset-x-0 top-1/2 h-6 w-full -translate-y-1/2 appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary focus-visible:[&::-webkit-slider-thumb]:ring-3 focus-visible:[&::-webkit-slider-thumb]:ring-ring/60 focus-visible:[&::-moz-range-thumb]:ring-3 focus-visible:[&::-moz-range-thumb]:ring-ring/60";

function getBounds(facets: CatalogFacets | undefined): PriceBounds | null {
  if (!facets?.price) return null;
  return {
    lower: toEthSteps(facets.price.min, PRICE_STEP, "floor"),
    upper: toEthSteps(facets.price.max, PRICE_STEP, "ceil"),
  };
}

function clampSteps(value: number, bounds: PriceBounds): number {
  return Math.min(Math.max(value, bounds.lower), bounds.upper);
}

function initialSteps(amount: EthAmount | undefined, fallback: number, bounds: PriceBounds | null, rounding: "floor" | "ceil"): number {
  if (!amount || !bounds) return fallback;
  return clampSteps(toEthSteps(amount, PRICE_STEP, rounding), bounds);
}

function stepsFor(filters: CatalogFilters, bounds: PriceBounds | null): [number, number] {
  return [
    initialSteps(filters.priceMin, bounds?.lower ?? 0, bounds, "floor"),
    initialSteps(filters.priceMax, bounds?.upper ?? 0, bounds, "ceil"),
  ];
}

type FacetListProps<Value extends string> = {
  legend: string;
  options: readonly Value[];
  labels: Record<Value, string>;
  counts: Record<Value, number> | undefined;
  selected: Value[];
  onToggle: (value: Value, isChecked: boolean) => void;
};

const COLLATOR = new Intl.Collator("pt-BR", { sensitivity: "base", numeric: true });

function FacetList<Value extends string>({ legend, options, labels, counts, selected, onToggle }: FacetListProps<Value>): JSX.Element {
  const sorted = [...options].sort((left, right) => COLLATOR.compare(labels[left], labels[right]));

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className={LEGEND}>{legend}</legend>
      <div className="flex flex-col px-3">
        {sorted.map((option) => (
          <label key={option} className={OPTION}>
            <input
              type="checkbox"
              className={HIT_AREA}
              aria-label={counts ? `${labels[option]}, ${counts[option]} ${counts[option] === 1 ? "NFT" : "NFTs"}` : undefined}
              checked={selected.includes(option)}
              onChange={(event) => onToggle(option, event.target.checked)}
            />
            <span className="flex items-center gap-1.5">
              <Check aria-hidden="true" className={CHECK} />
              {labels[option]}
            </span>
            {counts && (
              <span aria-hidden="true" className="font-bold">
                ({counts[option]})
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

type PriceRangeProps = {
  bounds: PriceBounds | null;
  steps: [number, number];
  onChange: (steps: [number, number]) => void;
};

function PriceRange({ bounds, steps, onChange }: PriceRangeProps): JSX.Element {
  const [minSteps, maxSteps] = steps;

  if (!bounds) {
    return <p className="text-body text-text-secondary">Sem preços para filtrar.</p>;
  }

  const span = Math.max(bounds.upper - bounds.lower, 1);
  const left = ((minSteps - bounds.lower) / span) * 100;
  const right = ((bounds.upper - maxSteps) / span) * 100;
  const minLabel = `${formatEth(fromEthSteps(minSteps, PRICE_STEP))} ETH`;
  const maxLabel = `${formatEth(fromEthSteps(maxSteps, PRICE_STEP))} ETH`;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-6">
        <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border-soft" />
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${left}%`, right: `${right}%` }}
        />
        <label className="sr-only" htmlFor="price-min">
          Preço mínimo
        </label>
        <input
          id="price-min"
          type="range"
          min={bounds.lower}
          max={bounds.upper}
          value={minSteps}
          aria-valuetext={minLabel}
          onChange={(event) => onChange([Math.min(Number.parseInt(event.target.value, 10), maxSteps), maxSteps])}
          className={THUMB}
        />
        <label className="sr-only" htmlFor="price-max">
          Preço máximo
        </label>
        <input
          id="price-max"
          type="range"
          min={bounds.lower}
          max={bounds.upper}
          value={maxSteps}
          aria-valuetext={maxLabel}
          onChange={(event) => onChange([minSteps, Math.max(Number.parseInt(event.target.value, 10), minSteps)])}
          className={THUMB}
        />
      </div>
      <p className="text-body">
        Preço: {formatEth(fromEthSteps(minSteps, PRICE_STEP))} - {maxLabel}
      </p>
    </div>
  );
}

function FilterForm({ filters, facets, mode, onApply }: FilterFormProps): JSX.Element {
  const bounds = getBounds(facets);
  const [categories, setCategories] = useState(splitParam<Category>(filters.category));
  const [chains, setChains] = useState(splitParam<Chain>(filters.chain));
  const [priceSteps, setPriceSteps] = useState(() => stepsFor(filters, bounds));
  const facetKey = `${filters.category ?? ""}|${filters.chain ?? ""}`;
  const priceKey = `${filters.priceMin ?? ""}|${filters.priceMax ?? ""}|${bounds?.lower ?? ""}|${bounds?.upper ?? ""}`;
  const [syncedKeys, setSyncedKeys] = useState({ facetKey, priceKey });

  if (syncedKeys.facetKey !== facetKey || syncedKeys.priceKey !== priceKey) {
    setSyncedKeys({ facetKey, priceKey });
    if (syncedKeys.facetKey !== facetKey) {
      setCategories(splitParam<Category>(filters.category));
      setChains(splitParam<Chain>(filters.chain));
    }
    if (syncedKeys.priceKey !== priceKey) setPriceSteps(stepsFor(filters, bounds));
  }

  function priceFilters(): Pick<CatalogFilters, "priceMin" | "priceMax"> {
    if (!bounds) return { priceMin: filters.priceMin, priceMax: filters.priceMax };
    const [minSteps, maxSteps] = priceSteps;
    const priceMin = minSteps > bounds.lower ? fromEthSteps(minSteps, PRICE_STEP) : undefined;
    const priceMax = maxSteps < bounds.upper ? fromEthSteps(maxSteps, PRICE_STEP) : undefined;
    return { priceMin, priceMax: priceMin && priceMax && compareEth(priceMin, priceMax) > 0 ? priceMin : priceMax };
  }

  function apply(next: { categories: Category[]; chains: Chain[] }, price: Pick<CatalogFilters, "priceMin" | "priceMax">): void {
    onApply({ ...filters, ...price, category: joinParam(next.categories), chain: joinParam(next.chains) });
  }

  function handleCategory(category: Category, isChecked: boolean): void {
    const next = toggleItem(categories, category, isChecked);
    setCategories(next);
    if (mode === "instant") apply({ categories: next, chains }, filters);
  }

  function handleChain(chain: Chain, isChecked: boolean): void {
    const next = toggleItem(chains, chain, isChecked);
    setChains(next);
    if (mode === "instant") apply({ categories, chains: next }, filters);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    apply({ categories, chains }, priceFilters());
  }

  return (
    <form noValidate aria-label="Filtros" className="flex flex-col gap-10" onSubmit={handleSubmit}>
      <FacetList
        legend="Coleções"
        options={categorySchema.options}
        labels={CATEGORY_LABELS}
        counts={facets?.category}
        selected={categories}
        onToggle={handleCategory}
      />

      <fieldset className="flex flex-col gap-3">
        <legend className={LEGEND}>Faixa de preço</legend>
        <div className="flex flex-col items-start gap-3 pl-3">
          <div className="w-full">
            <PriceRange bounds={bounds} steps={priceSteps} onChange={setPriceSteps} />
          </div>
          <Button type="submit" size="sm" className="px-3">
            Aplicar
          </Button>
        </div>
      </fieldset>

      <FacetList
        legend="Rede"
        options={chainSchema.options}
        labels={CHAIN_LABELS}
        counts={facets?.chain}
        selected={chains}
        onToggle={handleChain}
      />
    </form>
  );
}

type CatalogFiltersPanelProps = {
  filters: CatalogFilters;
  facets: CatalogFacets | undefined;
  onApply: (filters: CatalogFilters) => void;
  isCompact: boolean;
};

export function CatalogFiltersPanel({ filters, facets, onApply, isCompact }: CatalogFiltersPanelProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  if (!isCompact) {
    return (
      <div className="bg-surface-card p-5">
        <FilterForm filters={filters} facets={facets} mode="instant" onApply={onApply} />
      </div>
    );
  }

  function handleApply(next: CatalogFilters): void {
    setIsOpen(false);
    onApply(next);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button size="icon" aria-label="Filtros" className="size-11 shrink-0" />}>
        <SlidersHorizontal aria-hidden="true" className="size-5" />
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Filtros</DialogTitle>
        </DialogHeader>
        <FilterForm filters={filters} facets={facets} mode="deferred" onApply={handleApply} />
      </DialogContent>
    </Dialog>
  );
}
