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

type OrderSnapshot = { id: string; status: string };
type CartSnapshot = { items: { editionId: string; quantity: number }[] } | null;

type ControlWindow = {
  __kurio: {
    inspect: { orders: () => OrderSnapshot[]; cart: (owner: string) => CartSnapshot };
    catalog: { setPrice: (nftId: string, editionId: string, price: string) => void };
  };
};

export async function serverOrders(page: Page): Promise<OrderSnapshot[]> {
  return page.evaluate(() => (window as unknown as ControlWindow).__kurio.inspect.orders());
}

export async function serverCart(page: Page, owner: string): Promise<CartSnapshot> {
  return page.evaluate((key) => (window as unknown as ControlWindow).__kurio.inspect.cart(key), owner);
}

export async function goToReview(page: Page): Promise<void> {
  await page.goto("/cart");
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pagamento" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Revisar pedido" })).toBeVisible();
  const connect = page.getByRole("button", { name: "Conectar MetaMask na Ethereum" });
  if (await connect.isVisible()) await connect.click();
  await expect(page.getByText("Conectada na Ethereum")).toBeVisible();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("heading", { name: "Revise o pedido" })).toBeVisible();
}
