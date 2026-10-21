import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openAuthDialog } from "@/lib/session/guards";

export const Route = createFileRoute("/register")({
  validateSearch: z.object({ redirect: z.string().optional().catch(undefined) }),
  beforeLoad: ({ search }) => openAuthDialog("register", search.redirect),
});
