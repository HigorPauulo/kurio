import { expect, test } from "@playwright/test";
import {
  expectNoA11yViolations,
  goToReview,
  login,
  logout,
  serverCart,
  serverOrders,
  startFresh,
} from "./support/kurio.js";

type PriceWindow = { __kurio: { catalog: { setPrice: (nftId: string, editionId: string, price: string) => void } } };

test.beforeEach(async ({ page }) => {
  await startFresh(page);
});

test("do carrinho ao recibo: campos do layout, revisão, pedido confirmado e recibo imutável", async ({ page }) => {
  await login(page, "ana@kurio.test", "/cart");
  await page.getByRole("link", { name: "Conectar e finalizar" }).click();

  const ens = page.getByLabel("Nome ENS");
  await expect(ens).toHaveValue("ana.eth");
  await expect(ens).toHaveAttribute("readonly");
  await expect(page.getByLabel("Endereço da carteira")).toHaveAttribute("readonly");
  await expect(page.getByLabel("Rede")).toHaveValue("ethereum");
  await expect(page.getByRole("link", { name: "Editar em Carteiras" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Conectar Coinbase/ })).toHaveCount(0);
  await expect(page.getByText("A carteira escolhida é MetaMask.").first()).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByText("Conecte a carteira na rede escolhida para continuar.")).toBeVisible();

  await page.getByLabel("Observação do colecionador (opcional)").fill("Presente de aniversário");
  await page.getByRole("button", { name: "Conectar MetaMask na Ethereum" }).click();
  await expect(page.getByText("Conectada na Ethereum")).toBeVisible();
  await expect(page.getByText("Conecte a carteira na rede escolhida para continuar.")).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page).toHaveURL(/step=review/);
  const summary = page.getByRole("definition").filter({ hasText: "0,8724 ETH" });
  await expect(summary).toBeVisible();
  await expect(page.getByText("Observação: Presente de aniversário")).toBeVisible();

  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page).toHaveURL(/\/orders\/ord_/);
  await expect(page.getByRole("heading", { level: 1, name: "Seus NFTs agora estão na sua carteira" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver no Etherscan (simulado)" })).toHaveAttribute("href", /^https:\/\/etherscan\.io\/tx\/0x/);
  await expectNoA11yViolations(page);

  const [order] = await serverOrders(page);
  expect(order.status).toBe("confirmed");
  expect(await serverCart(page, "usr_ana")).toMatchObject({ items: [] });
  await expect(page.getByRole("link", { name: "Carrinho vazio" })).toBeVisible();

  await page.evaluate(() => (window as unknown as PriceWindow).__kurio.catalog.setPrice("nft_004", "ed_004_1", "3"));
  await page.reload();
  await expect(page.getByText("0,8724 ETH").first()).toBeVisible();
});

test("Carla sem Nome ENS nem carteira fica bloqueada com o erro no campo", async ({ page }) => {
  await login(page, "carla@kurio.test", "/nft/nft_014");
  await page.getByRole("button", { name: "Adicionar ao carrinho" }).click();
  await expect(page.getByText("Adicionado.")).toBeVisible();

  await page.goto("/checkout");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByText("Complete o Nome ENS no perfil para comprar.")).toBeVisible();
  await expect(page.getByLabel("Nome ENS")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Cadastre uma carteira para comprar.")).toBeVisible();
  await expect(page).not.toHaveURL(/step=review/);
  await expect(page.getByLabel("Usar outra carteira?")).toBeDisabled();
});

test("Bruno na URL de um pedido da Ana vê a mesma tela de pedido inexistente", async ({ page }) => {
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page).toHaveURL(/\/orders\/ord_/);
  const orderUrl = new URL(page.url()).pathname;

  await logout(page);
  await login(page, "bruno@kurio.test");
  await page.goto(orderUrl);
  await expect(page.getByRole("heading", { level: 1, name: "Pedido não encontrado" })).toBeVisible();
  await expect(page.getByText("0,8724")).toHaveCount(0);

  await page.goto("/orders/ord_999");
  await expect(page.getByRole("heading", { level: 1, name: "Pedido não encontrado" })).toBeVisible();
});
