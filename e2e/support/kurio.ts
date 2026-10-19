import { AxeBuilder } from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export const PASSWORD = "Kurio@2026";

export async function startFresh(page: Page, scenario = "fast", path = "/"): Promise<void> {
  const separator = path.includes("?") ? "&" : "?";
  await page.goto(`${path}${separator}scenario=${scenario}&reset=1`);
  await page.waitForFunction(() => "__kurio" in window);
}

export async function login(page: Page, email: string, redirect?: string): Promise<void> {
  await page.goto(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : "/login");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("E-mail").fill(email);
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("button", { name: "Sair" })).toBeVisible();
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible();
}

export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  const blocking = results.violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
  expect(blocking).toEqual([]);
}
