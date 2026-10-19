import { createFileRoute } from "@tanstack/react-router";
import { WalletsPage } from "@/features/account/components/WalletsPage";
import { requireUserId } from "@/lib/session/guards";

export const Route = createFileRoute("/account/wallets")({
  beforeLoad: ({ location }) => ({ userId: requireUserId(location) }),
  component: WalletsRoute,
});

function WalletsRoute() {
  const { userId } = Route.useRouteContext();
  return <WalletsPage userId={userId} />;
}
