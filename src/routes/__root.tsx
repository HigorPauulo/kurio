import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Link, Outlet, useLocation } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { LiveRegion } from "@/components/layout/LiveRegion";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { z } from "zod";
import { AuthOverlay } from "@/features/auth/components/AuthOverlay";
import { ExpiredSessionDialog } from "@/features/auth/components/ExpiredSessionDialog";
import { dropAuthDialogIfAuthenticated } from "@/lib/session/guards";
import { cn } from "@/lib/utils";

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: z.object({
    auth: z.enum(["login", "register"]).optional().catch(undefined),
    redirect: z.string().optional().catch(undefined),
  }),
  beforeLoad: ({ location, search }) => dropAuthDialogIfAuthenticated(location, search.auth),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  const location = useLocation();
  const isFullScreen = location.pathname.startsWith("/orders/");
  const hasBuyBar = location.pathname.startsWith("/nft/");
  const hasTabBar = !isFullScreen && !hasBuyBar && location.pathname !== "/cart" && location.pathname !== "/checkout";

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col max-md:has-data-fixed-bar:pb-28 max-md:has-data-fixed-sheet:pb-112",
        hasTabBar && "pb-20 md:pb-0",
        hasBuyBar && "pb-56 md:pb-0",
      )}
    >
      {!isFullScreen && <Header />}
      <div className="flex flex-1 flex-col">
        <Outlet />
      </div>
      {!isFullScreen && <Footer />}
      {hasTabBar && <MobileTabBar />}
      <AuthOverlay />
      <ExpiredSessionDialog />
      <LiveRegion />
    </div>
  );
}

function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col items-start gap-4 px-page pt-16">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-text-secondary">O endereço acessado não existe no Kurio.</p>
      <Link to="/" className={buttonVariants()}>
        Voltar ao início
      </Link>
    </main>
  );
}
