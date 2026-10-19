import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

async function enableMocks(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCKS === "false") return;
  const { start } = await import("../mocks/browser");
  await start();
}

await enableMocks();

const { default: App } = await import("./App.tsx");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
