import { ws } from "msw";
import { setupWorker } from "msw/browser";
import { toSocketIo } from "@mswjs/socket.io-binding";

const VALID_TOKEN = "spike-token";
const PING_INTERVAL_MS = 25_000;
const ENGINE_IO_PING = "2";

const realtime = ws.link("wss://realtime.kurio.mock/*");

const handlers = [
  realtime.addEventListener("connection", (connection) => {
    const heartbeat = setInterval(
      () => connection.client.send(ENGINE_IO_PING),
      PING_INTERVAL_MS,
    );
    connection.client.addEventListener("close", () => clearInterval(heartbeat));

    let pendingAckId: number | null = null;

    connection.client.addEventListener("message", (event) => {
      if (typeof event.data !== "string") return;
      const packet = event.data;

      if (packet.startsWith("40")) {
        const auth = JSON.parse(packet.slice(2) || "{}") as { token?: string };
        if (auth.token !== VALID_TOKEN) {
          const refusal = {
            message: "SESSION_EXPIRED",
            data: { code: "SESSION_EXPIRED" },
          };
          connection.client.send(`44${JSON.stringify(refusal)}`);
        }
        return;
      }

      const ackMatch = /^42(\d+)\["nft\.subscribe"/.exec(packet);
      if (ackMatch) pendingAckId = Number(ackMatch[1]);
    });

    const io = toSocketIo(connection);

    io.client.on("ping-spike", () => {
      io.client.emit("pong-spike", "olá do servidor simulado");
    });

    io.client.on("nft.subscribe", () => {
      if (pendingAckId === null) return;
      connection.client.send(
        `43${pendingAckId}${JSON.stringify([{ ok: true }])}`,
      );
      pendingAckId = null;
    });
  }),
];

export function start(): Promise<unknown> {
  return setupWorker(...handlers).start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.origin === location.origin && !url.pathname.startsWith("/api"))
        return;
      print.error();
    },
  });
}
