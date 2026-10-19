import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { LoginDialog } from "@/features/auth/components/LoginDialog";
import { redirectIfAuthenticated } from "@/lib/session/guards";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => redirectIfAuthenticated(search.redirect),
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect } = Route.useSearch();
  return <LoginDialog redirect={redirect} />;
}
