import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const MOCKS = {
  group: ["**/mocks", "**/mocks/**"],
  message:
    "src/ não importa mocks/: o app só fala com o backend pela rede (MOC-1).",
};
const API_MODULE = {
  group: ["**/api", "**/api.ts"],
  message: "Componente não chama api.ts: use features/*/queries.ts.",
};
const HTTP_MODULE = {
  group: ["**/lib/http", "**/lib/http/**"],
  message: "Componente não usa o transporte HTTP: use features/*/queries.ts.",
};
const SESSION_MODULE = {
  regex: "(^|/)(lib/)?session(/|$)",
  message:
    "lib/http e lib/realtime não importam lib/session: use configureHttp e eventStore.reset.",
};
const AXIOS = {
  name: "axios",
  message: "Componente não usa Axios: use features/*/queries.ts.",
};
const REACT = {
  name: "react",
  message: "api.ts é transporte puro, sem React.",
};

export default defineConfig([
  globalIgnores([
    "dist",
    "coverage",
    "playwright-report",
    "test-results",
    "public/mockServiceWorker.js",
    "src/routeTree.gen.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": "error",
      "@typescript-eslint/only-throw-error": [
        "error",
        {
          allow: [
            { from: "package", package: "@tanstack/router-core", name: "Redirect" },
            { from: "package", package: "@tanstack/router-core", name: "NotFoundError" },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "mocks/**/*.ts"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["e2e/**/*.ts", "*.config.ts"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["src/**/*.tsx"],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  {
    files: ["src/routes/**/*.tsx", "src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [MOCKS] }],
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "Sem fetch direto: REST passa por features/*/api.ts (Axios).",
        },
        {
          name: "WebSocket",
          message:
            "Sem WebSocket direto: tempo real passa por lib/realtime (Socket.IO).",
        },
      ],
    },
  },
  {
    files: ["src/**/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { paths: [AXIOS], patterns: [MOCKS, API_MODULE, HTTP_MODULE] },
      ],
    },
  },
  {
    files: ["src/lib/http/**/*.ts", "src/lib/realtime/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [MOCKS, SESSION_MODULE] }],
    },
  },
  {
    files: ["src/features/*/api.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: [REACT], patterns: [MOCKS] }],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='parseFloat']",
          message: "Valor ETH só por lib/eth: parseFloat perde precisão.",
        },
        {
          selector: "CallExpression[callee.name='Number']",
          message: "Valor ETH só por lib/eth: Number perde precisão.",
        },
      ],
    },
  },
  {
    files: ["src/main.tsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);
