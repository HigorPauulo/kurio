import { expect, test } from "@playwright/test";
import { goToReview, login, serverCart, serverOrders, startFresh } from "./support/kurio.js";

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
