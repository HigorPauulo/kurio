import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/unavailable")({
  validateSearch: z.object({ from: z.string().optional().catch(undefined) }),
  component: UnavailableRoute,
});

function UnavailableRoute() {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col items-start gap-4 px-4 pt-16">
      <h1 className="text-2xl font-bold">Seção fora da demonstração</h1>
      <p>Esta parte do Kurio não faz parte desta demonstração, e nenhuma ação foi realizada.</p>
      <Link to="/" className="text-text-accent underline underline-offset-4">
        Voltar ao início
      </Link>
    </main>
  );
}
