import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { CatalogPage, type SearchChange } from "@/features/catalog/components/CatalogPage";
import { catalogListQuery, featuredNftsQuery } from "@/features/catalog/queries";
import { parseCatalogSearch } from "@/features/catalog/search";

export const Route = createFileRoute("/")({
  validateSearch: parseCatalogSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(featuredNftsQuery());
    void context.queryClient.prefetchQuery(catalogListQuery(deps));
  },
  component: HomeRoute,
});

function HomeRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const handleSearchChange = useCallback<SearchChange>(
    (patch, options) => {
      void navigate({ search: (previous) => ({ ...previous, page: undefined, ...patch }), replace: options?.replace });
    },
    [navigate],
  );

  return <CatalogPage search={search} onSearchChange={handleSearchChange} />;
}
