import { isPresetName, type PresetName } from "./presets";

export const SCENARIO_STORAGE_KEY = "kurio:scenario";
export const DEFAULT_SCENARIO = "default";

export function parseScenario(value: string | null | undefined): PresetName[] | null {
  if (!value) return null;
  const names = value.split(/[+\s]+/).filter(Boolean);
  if (names.length === 0 || !names.every(isPresetName)) return null;
  return names;
}

export type InitialScenarioInput = {
  search: string;
  stored: string | null;
  envDefault: string | undefined;
};

export type InitialScenario = {
  names: PresetName[];
  reset: boolean;
};

export function resolveInitialScenario({
  search,
  stored,
  envDefault,
}: InitialScenarioInput): InitialScenario {
  const params = new URLSearchParams(search);
  const names =
    parseScenario(params.get("scenario")) ??
    parseScenario(stored) ??
    parseScenario(envDefault) ??
    [DEFAULT_SCENARIO];
  return { names, reset: params.get("reset") === "1" };
}

export function stripScenarioParams(search: string): string {
  const params = new URLSearchParams(search);
  params.delete("scenario");
  params.delete("reset");
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}
