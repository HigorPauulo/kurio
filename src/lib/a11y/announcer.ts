import { useSyncExternalStore } from "react";

export type Politeness = "polite" | "assertive";

export type Announcement = { id: number; message: string; politeness: Politeness };

let current: Announcement | null = null;
let sequence = 0;
const listeners = new Set<() => void>();

export function announce(message: string, politeness: Politeness = "polite"): void {
  sequence += 1;
  current = { id: sequence, message, politeness };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAnnouncement(): Announcement | null {
  return useSyncExternalStore(subscribe, () => current);
}
