import { createRouter } from "@tanstack/react-router";
import { queryClient } from "@/lib/query/queryClient";
import { parsePlainSearch, stringifyPlainSearch } from "@/lib/url/search";
import { routeTree } from "./routeTree.gen";

export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
  parseSearch: parsePlainSearch,
  stringifySearch: stringifyPlainSearch,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
