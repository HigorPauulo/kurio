import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { UnderConstruction } from "@/components/UnderConstruction";

export const Route = createFileRoute("/unavailable")({
  validateSearch: z.object({ from: z.string().optional().catch(undefined) }),
  component: UnavailableRoute,
});

function UnavailableRoute() {
  const { from } = Route.useSearch();
  return <UnderConstruction from={from} />;
}
