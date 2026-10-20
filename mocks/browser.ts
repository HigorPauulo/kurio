import { setupWorker } from "msw/browser";
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
import { createRealtimeServer, type RealtimeServer } from "./realtime/server";
import { buildScenario, type PresetName } from "./scenarios/presets";
import {
  DEFAULT_SCENARIO,
  parseScenario,
  resolveInitialScenario,
  SCENARIO_STORAGE_KEY,
  stripScenarioParams,
} from "./scenarios/selection";

type Backend = { deps: HandlerDeps; realtime: RealtimeServer };

function setUpBackend(): Backend {
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
  const now = () => Date.now();
  const realtime = createRealtimeServer({ db, getScenario, now });

  window.__kurio = createControl({
    db,
    conditions,
    getScenarioNames: () => scenarioNames,
    setScenarioNames: saveScenario,
    defaultScenarioNames: parseScenario(import.meta.env.VITE_MOCK_DEFAULT_SCENARIO) ?? [DEFAULT_SCENARIO],
    realtime,
    build: import.meta.env.VITE_BUILD_SHA,
  });

  return { deps: { db, conditions, getScenario, now }, realtime };
}

export function start(): Promise<unknown> {
  const { deps, realtime } = setUpBackend();
  return setupWorker(
    ...authHandlers(deps),
    ...nftHandlers(deps),
    ...favoriteHandlers(deps),
    ...cartHandlers(deps),
    ...meHandlers(deps),
    ...walletHandlers(deps),
    realtime.handler,
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
