import { Check, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent, type JSX } from "react";
import { TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { categorySchema, chainSchema, type Category, type Chain } from "@/contracts/common";
import { compareEth, formatEthInput, parseEthInput } from "@/lib/eth";
import { toggleItem } from "@/lib/list";
import { CATEGORY_LABELS, CHAIN_LABELS } from "../labels";
import { CLEARED_FILTERS, joinParam, splitParam, type CatalogFilters, type CatalogStatus } from "../search";

type FilterFormProps = {
  filters: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
};

const LEGEND = "mb-3 text-lg leading-4 font-bold";
const OPTION =
  "group/option relative flex cursor-pointer items-center justify-between text-body leading-10 text-text-secondary hover:text-text-accent has-checked:text-text-accent has-focus-visible:rounded-sm has-focus-visible:ring-2 has-focus-visible:ring-ring";
const HIT_AREA = "absolute inset-0 size-full cursor-pointer appearance-none opacity-0";
const CHECK = "invisible size-4 group-has-checked/option:visible";

const STATUS_OPTIONS: { value: CatalogStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "available", label: "Disponíveis" },
  { value: "sold_out", label: "Esgotados" },
];

function FilterForm({ filters, onApply }: FilterFormProps): JSX.Element {
  const [categories, setCategories] = useState(splitParam<Category>(filters.category));
  const [chains, setChains] = useState(splitParam<Chain>(filters.chain));
  const [status, setStatus] = useState<CatalogStatus | "">(filters.status ?? "");
  const [priceMin, setPriceMin] = useState(filters.priceMin ? formatEthInput(filters.priceMin) : "");
  const [priceMax, setPriceMax] = useState(filters.priceMax ? formatEthInput(filters.priceMax) : "");
  const [errors, setErrors] = useState<{ priceMin?: string; priceMax?: string }>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const min = priceMin.trim() ? parseEthInput(priceMin) : undefined;
    const max = priceMax.trim() ? parseEthInput(priceMax) : undefined;
    const nextErrors = {
      priceMin: min === null ? "Informe um valor em ETH, como 0,5." : undefined,
      priceMax:
        max === null
          ? "Informe um valor em ETH, como 2,5."
          : min && max && compareEth(min, max) > 0
            ? "O preço máximo deve ser maior ou igual ao mínimo."
            : undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.priceMin || nextErrors.priceMax) return;

    onApply({
      category: joinParam(categories),
      chain: joinParam(chains),
      status: status || undefined,
      priceMin: min ?? undefined,
      priceMax: max ?? undefined,
    });
  }

  return (
    <form noValidate aria-label="Filtros" className="flex flex-col gap-10" onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-3">
        <legend className={LEGEND}>Coleções</legend>
        <div className="flex flex-col px-3">
          {categorySchema.options.map((category) => (
            <label key={category} className={OPTION}>
              <input
                type="checkbox"
                className={HIT_AREA}
                checked={categories.includes(category)}
                onChange={(event) => setCategories(toggleItem(categories, category, event.target.checked))}
              />
              {CATEGORY_LABELS[category]}
              <Check aria-hidden="true" className={CHECK} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={LEGEND}>Faixa de preço (ETH)</legend>
        <div className="flex flex-col gap-3 pl-3">
          <TextField
            label="Preço mínimo"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,02"
            value={priceMin}
            error={errors.priceMin}
            onChange={(event) => setPriceMin(event.target.value)}
          />
          <TextField
            label="Preço máximo"
            inputMode="decimal"
            autoComplete="off"
            placeholder="12,3"
            value={priceMax}
            error={errors.priceMax}
            onChange={(event) => setPriceMax(event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={LEGEND}>Rede</legend>
        <div className="flex flex-col pl-3">
          {chainSchema.options.map((chain) => (
            <label key={chain} className={OPTION}>
              <input
                type="checkbox"
                className={HIT_AREA}
                checked={chains.includes(chain)}
                onChange={(event) => setChains(toggleItem(chains, chain, event.target.checked))}
              />
              {CHAIN_LABELS[chain]}
              <Check aria-hidden="true" className={CHECK} />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className={LEGEND}>Disponibilidade</legend>
        <div className="flex flex-col pl-3">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className={OPTION}>
              <input
                type="radio"
                name="status"
                className={HIT_AREA}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
              />
              {option.label}
              <Check aria-hidden="true" className={CHECK} />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 pl-3">
        <Button type="submit" size="sm">
          Aplicar filtros
        </Button>
        <Button type="button" variant="link" size="sm" className="px-0" onClick={() => onApply(CLEARED_FILTERS)}>
          Limpar filtros
        </Button>
      </div>
    </form>
  );
}

type CatalogFiltersPanelProps = FilterFormProps & { isCompact: boolean };

export function CatalogFiltersPanel({ filters, onApply, isCompact }: CatalogFiltersPanelProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const formKey = JSON.stringify(filters);

  if (!isCompact) {
    return (
      <div className="bg-surface-card p-5">
        <FilterForm key={formKey} filters={filters} onApply={onApply} />
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
        <FilterForm key={formKey} filters={filters} onApply={handleApply} />
      </DialogContent>
    </Dialog>
  );
}
