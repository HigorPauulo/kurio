const PROBE_KEY = "kurio:storage-probe";

export function openStorage(access: () => Storage): Storage | null {
  try {
    const storage = access();
    storage.setItem(PROBE_KEY, PROBE_KEY);
    storage.removeItem(PROBE_KEY);
    return storage;
  } catch {
    return null;
  }
}
