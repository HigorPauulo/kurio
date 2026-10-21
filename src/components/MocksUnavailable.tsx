import type { JSX } from "react";

export function MocksUnavailable(): JSX.Element {
  return (
    <main className="mx-auto flex w-full max-w-300 flex-col items-start gap-4 px-page pt-16">
      <h1 className="text-2xl font-bold">
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
