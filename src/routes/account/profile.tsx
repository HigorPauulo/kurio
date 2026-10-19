import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/features/account/components/ProfilePage";
import { requireUserId } from "@/lib/session/guards";

export const Route = createFileRoute("/account/profile")({
  beforeLoad: ({ location }) => ({ userId: requireUserId(location) }),
  component: ProfileRoute,
});

function ProfileRoute() {
  const { userId } = Route.useRouteContext();
  return <ProfilePage userId={userId} />;
}
