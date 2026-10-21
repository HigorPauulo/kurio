import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

type VercelConfig = { headers: { headers: { key: string; value: string }[] }[] };

test.describe("bootstrap", () => {
  test.use({ serviceWorkers: "block" });

  test("avisa em vez de mostrar tela em branco quando o Service Worker é bloqueado", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Não foi possível iniciar a demonstração",
      }),
    ).toBeVisible();
  });
});

test.describe("bootstrap com armazenamento bloqueado", () => {
  test("mostra o aviso sem entrar em loop de recarga quando o localStorage é bloqueado", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Acesso bloqueado", "SecurityError");
        },
      });
    });
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Não foi possível iniciar a demonstração" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(navigations).toBeLessThanOrEqual(2);
  });
});

test.describe("bootstrap com a CSP de produção", () => {
  test("o app sobe e navega sem nenhuma violação da CSP do vercel.json", async ({ page }) => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as VercelConfig;
    const csp = config.headers.flatMap((rule) => rule.headers).find((header) => header.key === "Content-Security-Policy")?.value;
    expect(csp).toBeTruthy();
    await page.route("**/*", async (route) => {
      if (route.request().resourceType() !== "document") return route.continue();
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), "content-security-policy": csp ?? "" } });
    });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Audits.enable");
    const violations: string[] = [];
    cdp.on("Audits.issueAdded", ({ issue }) => {
      if (issue.code === "ContentSecurityPolicyIssue") violations.push(JSON.stringify(issue.details));
    });

    await page.goto("/?scenario=fast&reset=1");
    await expect(page.getByRole("list", { name: "Resultados" })).toBeVisible();
    await page.goto("/nft/nft_001");
    await expect(page.locator("main h1")).toHaveText("Emerald Ape #042");

    expect(violations).toEqual([]);
  });
});
