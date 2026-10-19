import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MocksUnavailable } from "@/components/MocksUnavailable";
import "./index.css";

const RELOAD_MARK_KEY = "kurio:reloaded-at";
const RELOAD_COOLDOWN_MS = 10_000;

function reloadOnceForStaleChunk(): void {
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_MARK_KEY) ?? 0);
    if (Date.now() - lastReload < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_MARK_KEY, String(Date.now()));
  } catch {
    return;
  }
  window.location.reload();
}

window.addEventListener("vite:preloadError", reloadOnceForStaleChunk);

async function enableMocks(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS === "false") return;
  const { start } = await import("../mocks/browser");
  await start();
}

async function bootstrap(): Promise<void> {
  const root = createRoot(document.getElementById("root")!);

  try {
    await enableMocks();
  } catch (error) {
    reportError(error);
    root.render(<MocksUnavailable />);
    return;
  }

  const { default: App } = await import("./App.tsx");
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
