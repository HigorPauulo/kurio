import { sessionSchema, type Session } from "@/contracts/user";

export const SESSION_STORAGE_KEY = "kurio:session";
const MAX_TIMER_MS = 2_147_483_647;

export type SessionState =
  | { status: "anonymous" }
  | { status: "authenticated"; session: Session }
  | { status: "expired"; session: Session };

export type SessionStore = {
  getState: () => SessionState;
  subscribe: (listener: () => void) => () => void;
  setSession: (session: Session) => void;
  expire: () => void;
  clear: () => void;
  getToken: () => string | null;
};

export type SessionStoreOptions = {
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null;
  now?: () => number;
};

function readStored(storage: SessionStoreOptions["storage"]): Session | null {
  try {
    const raw = storage?.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeStored(storage: SessionStoreOptions["storage"], session: Session | null): void {
  try {
    if (session) storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    else storage?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    return;
  }
}

export function createSessionStore({ storage, now = () => Date.now() }: SessionStoreOptions): SessionStore {
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let state: SessionState = { status: "anonymous" };

  function emit(next: SessionState): void {
    state = next;
    for (const listener of listeners) listener();
  }

  function schedule(session: Session): void {
    clearTimeout(timer);
    const remaining = Date.parse(session.expiresAt) - now();
    timer = setTimeout(() => store.expire(), Math.min(Math.max(remaining, 0), MAX_TIMER_MS));
  }

  const store: SessionStore = {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setSession(session) {
      writeStored(storage, session);
      emit({ status: "authenticated", session });
      schedule(session);
    },
    expire() {
      if (state.status !== "authenticated") return;
      clearTimeout(timer);
      emit({ status: "expired", session: state.session });
    },
    clear() {
      clearTimeout(timer);
      writeStored(storage, null);
      emit({ status: "anonymous" });
    },
    getToken: () => (state.status === "anonymous" ? null : state.session.token),
  };

  const stored = readStored(storage);
  if (stored) {
    if (Date.parse(stored.expiresAt) > now()) {
      state = { status: "authenticated", session: stored };
      schedule(stored);
    } else {
      state = { status: "expired", session: stored };
    }
  }

  return store;
}
