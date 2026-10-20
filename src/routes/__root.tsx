import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet, useLocation } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LiveRegion } from "@/components/layout/LiveRegion";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { ExpiredSessionDialog } from "@/features/auth/components/ExpiredSessionDialog";
import { cn } from "@/lib/utils";

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  const location = useLocation();
  const isFullScreen = location.pathname.startsWith("/orders/");

  return (
    <div className={cn("flex min-h-dvh flex-col", !isFullScreen && "pb-20 md:pb-0")}>
      {!isFullScreen && <Header />}
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      {!isFullScreen && <Footer />}
      {!isFullScreen && <MobileTabBar />}
      <ExpiredSessionDialog />
      <LiveRegion />
    </div>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col items-start gap-4 px-4 pt-16">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-text-secondary">O endereço acessado não existe no Kurio.</p>
      <Link to="/" className={buttonVariants()}>
        Voltar ao início
      </Link>
    </main>
  );
}
