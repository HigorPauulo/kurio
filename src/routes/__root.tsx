import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet } from "@tanstack/react-router";
import { Header } from "@/components/layout/Header";
import { LiveRegion } from "@/components/layout/LiveRegion";
import { ExpiredSessionDialog } from "@/features/auth/components/ExpiredSessionDialog";

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <ExpiredSessionDialog />
      <LiveRegion />
    </>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p>O endereço acessado não existe no Kurio.</p>
      <Link to="/" className="underline underline-offset-4">
        Voltar ao início
      </Link>
    </main>
  );
}
