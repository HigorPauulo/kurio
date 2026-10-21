import { execSync } from "node:child_process";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function readBuildSha(): string {
  const fromEnv = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv;
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "local";
  }
}

const PRELOADED_FONT = /roboto-mono-latin-wght-normal-[\w-]+\.woff2$/;

function preloadFont(): Plugin {
  return {
    name: "kurio:preload-font",
    apply: "build",
    transformIndexHtml(_html, context) {
      const font = Object.keys(context.bundle ?? {}).find((fileName) => PRELOADED_FONT.test(fileName));
      if (!font) return [];
      return [
        {
          tag: "link",
          attrs: { rel: "preload", as: "font", type: "font/woff2", href: `/${font}`, crossorigin: "" },
          injectTo: "head-prepend",
        },
      ];
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    preloadFont(),
  ],
  define: {
    "import.meta.env.VITE_BUILD_SHA": JSON.stringify(readBuildSha()),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
