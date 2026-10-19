import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { RegisterDialog } from "@/features/auth/components/RegisterDialog";
import { redirectIfAuthenticated } from "@/lib/session/guards";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => redirectIfAuthenticated(search.redirect),
  component: RegisterRoute,
});

function RegisterRoute() {
  const { redirect } = Route.useSearch();
  return <RegisterDialog redirect={redirect} />;
}
