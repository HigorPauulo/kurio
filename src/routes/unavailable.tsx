import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/unavailable")({
  validateSearch: z.object({ from: z.string().optional().catch(undefined) }),
  component: UnavailableRoute,
});

function UnavailableRoute() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Seção fora da demonstração</h1>
      <p>Esta parte do Kurio não faz parte desta demonstração, e nenhuma ação foi realizada.</p>
      <Link to="/" className="underline underline-offset-4">
        Voltar ao início
      </Link>
    </main>
  );
}
