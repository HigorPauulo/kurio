import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";

const SOCKET_URL = "https://realtime.kurio.mock";

type ConnectError = Error & { data?: { code?: string } };

export default function App() {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState("desconectado");
  const [log, setLog] = useState<string[]>([]);

  function addLog(line: string): void {
    const time = new Date().toLocaleTimeString("pt-BR");
    setLog((current) => [...current, `${time} ${line}`]);
  }

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: "spike-token" },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus(`conectado (${socket.id})`);
      socket.emit("ping-spike");
    });
    socket.on("pong-spike", (text: string) => addLog(`pergunta 1: ${text}`));
    socket.on("disconnect", (reason) => {
      setStatus(`desconectado: ${reason}`);
      addLog(`queda da conexão principal: ${reason}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  function handleSubscribe(): void {
    socketRef.current
      ?.timeout(2000)
      .emit(
        "nft.subscribe",
        { nftIds: ["nft_001"] },
        (error: Error | null, response: unknown) => {
          addLog(
            error
              ? "pergunta 2: sem ack em 2 s"
              : `pergunta 2: ack ${JSON.stringify(response)}`,
          );
        },
      );
  }

  function handleInvalidToken(): void {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: "token-vencido" },
      forceNew: true,
    });
    let attempts = 0;

    socket.on("connect", () =>
      addLog("pergunta 3: conectou (o binding aceita antes de ler o token)"),
    );
    socket.on("connect_error", (error: ConnectError) =>
      addLog(
        `pergunta 3: connect_error "${error.message}", code=${error.data?.code ?? "nenhum"}`,
      ),
    );
    socket.io.on("reconnect_attempt", () => {
      attempts += 1;
      addLog(`pergunta 3: tentativa de reconexão ${attempts}`);
    });

    window.setTimeout(() => {
      addLog(
        `pergunta 3: após 5 s, conectado=${socket.connected}, tentativas=${attempts}`,
      );
      socket.disconnect();
    }, 5000);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Spike Socket.IO</h1>
      <p>Status: {status}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleSubscribe}>Pergunta 2: assinar NFT (ack)</Button>
        <Button variant="outline" onClick={handleInvalidToken}>
          Pergunta 3: conectar com token inválido
        </Button>
      </div>
      <ol className="list-decimal pl-6 text-sm">
        {log.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ol>
    </main>
  );
}
