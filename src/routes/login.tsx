import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openAuthDialog } from "@/lib/session/guards";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => openAuthDialog("login", search.redirect),
});
