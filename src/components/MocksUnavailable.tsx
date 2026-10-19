import type { JSX } from "react";

export function MocksUnavailable(): JSX.Element {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">
        Não foi possível iniciar a demonstração
      </h1>
      <p>
        O Kurio simula o servidor dentro do navegador com um Service Worker, e
        este navegador bloqueou esse recurso. Isso costuma acontecer em janela
        privada ou com bloqueio de cookies e dados de sites.
      </p>
      <p>Abra o site em uma janela normal de um navegador atualizado.</p>
    </main>
  );
}
