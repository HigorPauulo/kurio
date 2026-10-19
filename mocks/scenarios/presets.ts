import type { ErrorCode } from "@/contracts/error";

export type NetworkRule = {
  methods?: readonly string[];
  path?: RegExp;
  latencyMs?: readonly [min: number, max: number];
  outOfOrder?: { baseMs: number; stepMs: number; cycle: number };
  failure?: { status: number; code: ErrorCode; firstCalls?: number };
  offline?: boolean;
};

export type ScenarioFlags = {
  emptyCatalog?: boolean;
  priceChangeOnReview?: boolean;
  orderTimeout?: boolean;
  walletReject?: boolean;
  socketDuplicates?: boolean;
  socketDrop?: boolean;
};

export type Scenario = {
  rules: NetworkRule[];
  settleMs: number;
  settleOutcome: "confirmed" | "refused";
  sessionTtlMs: number;
  flags: ScenarioFlags;
};

type Preset = Partial<Omit<Scenario, "flags">> & { flags?: ScenarioFlags };

const NFT_LIST = /^\/api\/nfts$/;
const READS = ["GET"] as const;

export const BASE_SCENARIO: Scenario = {
  rules: [{ latencyMs: [120, 450] }],
  settleMs: 3000,
  settleOutcome: "confirmed",
  sessionTtlMs: 30 * 60_000,
  flags: {},
};

export const PRESETS = {
  default: {},
  fast: { rules: [{ latencyMs: [0, 0] }], settleMs: 300 },
  slow: { rules: [{ methods: READS, latencyMs: [2500, 2500] }] },
  flaky: { rules: [{ failure: { status: 503, code: "UNAVAILABLE", firstCalls: 2 } }] },
  "out-of-order": {
    rules: [{ methods: READS, path: NFT_LIST, outOfOrder: { baseMs: 3000, stepMs: 1000, cycle: 3 } }],
  },
  "empty-catalog": { flags: { emptyCatalog: true } },
  offline: { rules: [{ offline: true }] },
  "session-short": { sessionTtlMs: 60_000 },
  "price-change-on-review": { flags: { priceChangeOnReview: true } },
  "order-timeout": { flags: { orderTimeout: true } },
  "payment-refused": { settleOutcome: "refused" },
  "wallet-reject": { flags: { walletReject: true } },
  "socket-duplicates": { flags: { socketDuplicates: true } },
  "socket-drop": { flags: { socketDrop: true } },
} satisfies Record<string, Preset>;

export type PresetName = keyof typeof PRESETS;

export const PRESET_NAMES = Object.keys(PRESETS) as PresetName[];

export function isPresetName(value: string): value is PresetName {
  return Object.hasOwn(PRESETS, value);
}

export function buildScenario(names: readonly PresetName[]): Scenario {
  return names.reduce<Scenario>((scenario, name) => {
    const preset: Preset = PRESETS[name];
    return {
      rules: [...scenario.rules, ...(preset.rules ?? [])],
      settleMs: preset.settleMs ?? scenario.settleMs,
      settleOutcome: preset.settleOutcome ?? scenario.settleOutcome,
      sessionTtlMs: preset.sessionTtlMs ?? scenario.sessionTtlMs,
      flags: { ...scenario.flags, ...preset.flags },
    };
  }, BASE_SCENARIO);
}
