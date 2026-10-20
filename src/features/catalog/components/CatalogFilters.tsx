import { SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent, type JSX } from "react";
import { TextField } from "@/components/form/TextField";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { categorySchema, chainSchema, type Category, type Chain } from "@/contracts/common";
import { compareEth, formatEthInput, parseEthInput } from "@/lib/eth";
import { CATEGORY_LABELS, CHAIN_LABELS } from "../labels";
import { joinParam, splitParam, type CatalogFilters, type CatalogStatus } from "../search";

type FilterFormProps = {
  filters: CatalogFilters;
  onApply: (filters: CatalogFilters) => void;
};

const STATUS_OPTIONS: { value: CatalogStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "available", label: "Disponíveis" },
  { value: "sold_out", label: "Esgotados" },
];

const EMPTY_FILTERS: CatalogFilters = {};

function toggle<Item>(values: readonly Item[], value: Item, isChecked: boolean): Item[] {
  const others = values.filter((item) => item !== value);
  return isChecked ? [...others, value] : others;
}

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
    <form noValidate aria-label="Filtros" className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Categorias</legend>
        {categorySchema.options.map((category) => (
          <label key={category} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={categories.includes(category)}
              onChange={(event) => setCategories(toggle(categories, category, event.target.checked))}
            />
            {CATEGORY_LABELS[category]}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-medium">Faixa de preço (ETH)</legend>
        <TextField
          label="Preço mínimo"
          inputMode="decimal"
          autoComplete="off"
          value={priceMin}
          error={errors.priceMin}
          onChange={(event) => setPriceMin(event.target.value)}
        />
        <TextField
          label="Preço máximo"
          inputMode="decimal"
          autoComplete="off"
          value={priceMax}
          error={errors.priceMax}
          onChange={(event) => setPriceMax(event.target.value)}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Rede</legend>
        {chainSchema.options.map((chain) => (
          <label key={chain} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={chains.includes(chain)}
              onChange={(event) => setChains(toggle(chains, chain, event.target.checked))}
            />
            {CHAIN_LABELS[chain]}
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-medium">Disponibilidade</legend>
        {STATUS_OPTIONS.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="status"
              checked={status === option.value}
              onChange={() => setStatus(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button type="submit">Aplicar filtros</Button>
        <Button type="button" variant="outline" onClick={() => onApply(EMPTY_FILTERS)}>
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
      <aside aria-label="Filtros do catálogo" className="w-56 shrink-0">
        <FilterForm key={formKey} filters={filters} onApply={onApply} />
      </aside>
    );
  }

  function handleApply(next: CatalogFilters): void {
    setIsOpen(false);
    onApply(next);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <SlidersHorizontal aria-hidden="true" />
        Filtros
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
