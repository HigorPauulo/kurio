import { useLocation, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type JSX, type KeyboardEvent } from "react";
import { SearchIcon } from "@/components/icons/KurioIcons";

const FIELD_ID = "header-search";

export function HeaderSearch(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const currentQuery = typeof location.search.q === "string" ? location.search.q : "";
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  useEffect(() => {
    if (isOpen || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    toggleRef.current?.focus();
  }, [isOpen]);

  function open(): void {
    setDraft(currentQuery);
    setIsOpen(true);
  }

  function close(): void {
    shouldRestoreFocusRef.current = true;
    setIsOpen(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const q = draft.trim() || undefined;
    setIsOpen(false);
    void navigate({ to: "/", search: (previous) => ({ ...previous, q, page: undefined }), hash: "mercado" });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") close();
  }

  if (!isOpen) {
    return (
      <button
        ref={toggleRef}
        type="button"
        aria-label="Abrir a busca"
        aria-expanded={false}
        aria-controls={FIELD_ID}
        onClick={open}
        className="hidden size-10 items-center justify-center rounded-md hover:text-text-accent md:inline-flex"
      >
        <SearchIcon className="size-5" />
      </button>
    );
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="hidden items-center md:flex">
      <label htmlFor={FIELD_ID} className="sr-only">
        Buscar NFTs
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          id={FIELD_ID}
          type="search"
          maxLength={80}
          autoFocus
          placeholder="Explorar coleções, NFTs ou criadores"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9 w-56 rounded-md border border-input bg-surface-card pr-9 pl-9 text-sm placeholder:text-secondary-base focus-visible:border-primary xl:w-72"
        />
        <button
          type="button"
          aria-label="Fechar a busca"
          onClick={close}
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-text-secondary hover:text-text-accent"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </form>
  );
}
