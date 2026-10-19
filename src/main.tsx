import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MocksUnavailable } from "@/components/MocksUnavailable";
import "./index.css";

window.addEventListener("vite:preloadError", () => {
  window.location.reload();
});

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
