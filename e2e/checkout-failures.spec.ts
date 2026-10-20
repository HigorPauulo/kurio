import { expect, test } from "@playwright/test";
import { goToReview, login, serverCart, serverOrders, startFresh } from "./support/kurio.js";

type ScenarioWindow = { __kurio: { scenario: { set: (presets: string) => void } } };

async function setScenario(page: import("@playwright/test").Page, presets: string): Promise<void> {
  await page.evaluate((value) => (window as unknown as ScenarioWindow).__kurio.scenario.set(value), presets);
}

test("pagamento recusado preserva o carrinho e devolve o estoque", async ({ page }) => {
  await startFresh(page, "fast+payment-refused");
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Pagamento recusado" })).toBeVisible();
  expect((await serverOrders(page))[0].status).toBe("refused");
  expect(await serverCart(page, "usr_ana")).toMatchObject({ items: [{ quantity: 1 }, { quantity: 2 }] });
  await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
  await expect(page.getByRole("link", { name: "Carrinho, 3 itens" })).toBeVisible();
});

test("duplo clique em confirmar gera um pedido só", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await page.getByRole("button", { name: "Confirmar compra" }).dblclick();

  await expect(page).toHaveURL(/\/orders\/ord_/);
  expect(await serverOrders(page)).toHaveLength(1);
});

test("reload durante o envio sem resposta recupera o mesmo pedido", async ({ page }) => {
  await startFresh(page, "fast+order-timeout");
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("button", { name: "Enviando pedido..." })).toBeVisible();
  await expect.poll(async () => (await serverOrders(page)).length).toBe(1);

  await page.reload();
  await expect(page).toHaveURL(/\/orders\/ord_/);
  await expect(page.getByRole("heading", { level: 1, name: "Seus NFTs agora estão na sua carteira" })).toBeVisible();
  expect(await serverOrders(page)).toHaveLength(1);
  expect(await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("kurio:checkout:attempt")))).toEqual([]);
});

test("carteira que recusa a conexão mostra o motivo e não deixa revisar", async ({ page }) => {
  await startFresh(page, "fast+wallet-reject");
  await login(page, "ana@kurio.test", "/checkout");
  await page.getByRole("button", { name: "Conectar MetaMask na Ethereum" }).click();
  await expect(page.getByText("A carteira recusou a conexão.")).toBeVisible();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page).not.toHaveURL(/step=review/);
});

test("carteira desconectada no servidor volta aos dados com o botão de conectar", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await page.evaluate(async () => {
    const { token } = JSON.parse(localStorage.getItem("kurio:session") ?? "{}") as { token: string };
    await window.fetch("/api/me/wallets/wal_ana_1/connection", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
  });

  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page).not.toHaveURL(/step=review/);
  await expect(page.getByText("Conecte a carteira na rede escolhida.")).toBeVisible();
  await page.getByRole("button", { name: "Conectar MetaMask na Ethereum" }).click();
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page).toHaveURL(/\/orders\/ord_/);
});

test("sem resposta depois das tentativas, só 'Tentar de novo' fica disponível e recupera o pedido", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await setScenario(page, "offline");
  await page.getByRole("button", { name: "Confirmar compra" }).click();

  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("button", { name: /Confirmar compra|Enviando pedido/ })).toHaveCount(0);
  await setScenario(page, "fast");
  await page.getByRole("button", { name: "Tentar de novo" }).click();
  await expect(page).toHaveURL(/\/orders\/ord_/);
  expect(await serverOrders(page)).toHaveLength(1);
});
