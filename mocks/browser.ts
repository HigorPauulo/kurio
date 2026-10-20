import { ws } from "msw";
import { setupWorker } from "msw/browser";
import { toSocketIo } from "@mswjs/socket.io-binding";
import { isConnectPacket, readConnectToken } from "./handshake";
import { createControl } from "./control";
import { authHandlers } from "./handlers/auth";
import { cartHandlers } from "./handlers/cart";
import { favoriteHandlers } from "./handlers/favorites";
import { meHandlers } from "./handlers/me";
import { nftHandlers } from "./handlers/nfts";
import type { HandlerDeps } from "./handlers/shared";
import { walletHandlers } from "./handlers/wallets";
import { createMockDb } from "./db/mockDb";
import { createSeed } from "./db/seed";
import { openStorage } from "./db/storage";
import { createNetworkConditions } from "./network/conditions";
import { buildScenario, type PresetName } from "./scenarios/presets";
import {
  DEFAULT_SCENARIO,
  parseScenario,
  resolveInitialScenario,
  SCENARIO_STORAGE_KEY,
  stripScenarioParams,
} from "./scenarios/selection";

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

      if (isConnectPacket(packet)) {
        if (readConnectToken(packet) !== VALID_TOKEN) {
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

function setUpBackend(): HandlerDeps {
  const storage = openStorage(() => localStorage);
  const initial = resolveInitialScenario({
    search: location.search,
    stored: storage?.getItem(SCENARIO_STORAGE_KEY) ?? null,
    envDefault: import.meta.env.VITE_MOCK_DEFAULT_SCENARIO,
  });
  let scenarioNames: PresetName[] = initial.names;

  function saveScenario(names: PresetName[]): void {
    scenarioNames = names;
    storage?.setItem(SCENARIO_STORAGE_KEY, names.join("+"));
  }

  const db = createMockDb({ seed: createSeed, storage });
  if (initial.reset) db.reset();
  saveScenario(scenarioNames);

  const cleanSearch = stripScenarioParams(location.search);
  if (cleanSearch !== location.search) {
    history.replaceState(history.state, "", `${location.pathname}${cleanSearch}${location.hash}`);
  }

  const getScenario = () => buildScenario(scenarioNames);
  const conditions = createNetworkConditions({ getScenario });

  window.__kurio = createControl({
    db,
    conditions,
    getScenarioNames: () => scenarioNames,
    setScenarioNames: saveScenario,
    defaultScenarioNames: parseScenario(import.meta.env.VITE_MOCK_DEFAULT_SCENARIO) ?? [DEFAULT_SCENARIO],
    build: import.meta.env.VITE_BUILD_SHA,
  });

  return { db, conditions, getScenario, now: () => Date.now() };
}

export function start(): Promise<unknown> {
  const deps = setUpBackend();
  return setupWorker(
    ...authHandlers(deps),
    ...nftHandlers(deps),
    ...favoriteHandlers(deps),
    ...cartHandlers(deps),
    ...meHandlers(deps),
    ...walletHandlers(deps),
    ...handlers,
  ).start({
    onUnhandledRequest(request, print) {
      const url = new URL(request.url);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (url.origin === location.origin && !url.pathname.startsWith("/api"))
        return;
      print.error();
    },
  });
}
