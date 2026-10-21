import { expect, test, type Page } from "@playwright/test";
import { expectCartCount, expectNoA11yViolations, login, startFresh } from "./support/kurio.js";

type ServerCart = { items: { editionId: string; quantity: number }[]; coupon: { code: string } | null } | null;

type KurioWindow = {
  __kurio: {
    inspect: { cart: (owner: string) => ServerCart };
    catalog: { setAvailable: (nftId: string, editionId: string, available: number) => void };
  };
};

async function serverCart(page: Page, owner: string): Promise<ServerCart> {
  return page.evaluate((key) => (window as unknown as KurioWindow).__kurio.inspect.cart(key), owner);
}

async function guestOwner(page: Page): Promise<string> {
  return `guest:${await page.evaluate(() => localStorage.getItem("kurio:guestCartId"))}`;
}

async function addToCart(page: Page, nftId: string, quantity = 1): Promise<void> {
  await page.goto(`/nft/${nftId}`);
  const increase = page.getByRole("button", { name: "Aumentar quantidade" });
  for (let step = 1; step < quantity; step += 1) await increase.click();
  await page.getByRole("button", { name: "Comprar" }).click();
  await expect(page.getByText("Adicionado.")).toBeVisible();
}

function summary(page: Page) {
  return page.getByRole("region", { name: "Resumo do pedido" });
}

test.beforeEach(async ({ page }) => {
  await startFresh(page);
});

test("visitante respeita o limite da edição, altera, e o carrinho persiste no refresh", async ({ page }) => {
  await addToCart(page, "nft_001", 3);
  await page.getByRole("button", { name: "Comprar" }).click();
  await expect(page.getByRole("alert")).toHaveText("Esta edição permite até 3 unidades no carrinho.");
  await expect(page.getByRole("link", { name: "Carrinho, 3 itens" })).toBeVisible();

  await page.getByRole("link", { name: "Carrinho, 3 itens" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Carrinho" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aumentar quantidade de Emerald Ape #042" })).toBeDisabled();
  await expect(summary(page).getByText("7,1424 ETH")).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByRole("button", { name: "Diminuir quantidade de Emerald Ape #042" }).click();
  await expect(summary(page).getByText("4,7621 ETH")).toBeVisible();
  expect(await serverCart(page, await guestOwner(page))).toMatchObject({ items: [{ editionId: "ed_001_1", quantity: 2 }] });

  await page.reload();
  await expect(page.getByRole("group", { name: "Quantidade de Emerald Ape #042" })).toContainText("2");
  await expect(summary(page).getByText("4,7621 ETH")).toBeVisible();

  await page.getByRole("button", { name: "Remover Emerald Ape #042" }).click();
  await expect(page.getByText("Seu carrinho está vazio.")).toBeVisible();
});

test("cupom inválido, expirado e abaixo do mínimo têm mensagens distintas; válido aplica e remove", async ({ page }) => {
  await addToCart(page, "nft_014");
  await page.goto("/cart");
  const coupon = page.getByLabel("Tem um código promocional?");
  const apply = page.getByRole("button", { name: "Aplicar" });

  for (const [code, message] of [
    ["NADA", "Cupom inválido."],
    ["EXPIRADO", "Este cupom expirou."],
    ["FIXO005", "Este cupom vale para compras a partir de 0,05 ETH."],
  ]) {
    await coupon.fill(code);
    await apply.click();
    await expect(page.getByText(message)).toBeVisible();
    await expect(coupon).toHaveAttribute("aria-invalid", "true");
  }

  await coupon.fill("kurio10");
  await apply.click();
  await expect(summary(page).getByText("Cupom KURIO10 aplicado: 10% de desconto")).toBeVisible();
  await expect(summary(page).getByText("- 0,0001 ETH")).toBeVisible();
  expect(await serverCart(page, await guestOwner(page))).toMatchObject({ coupon: { code: "KURIO10" } });

  await page.getByRole("button", { name: "Remover cupom" }).click();
  await expect(page.getByLabel("Tem um código promocional?")).toBeVisible();
});

test("resumo vem da cotação com precisão decimal", async ({ page }) => {
  await login(page, "ana@kurio.test", "/cart");
  await expect(summary(page).getByText("0,87 ETH", { exact: true })).toBeVisible();
  await expect(summary(page).getByText("0,0024 ETH")).toBeVisible();
  await expect(summary(page).getByText("0,8724 ETH")).toBeVisible();

  await page.getByLabel("Tem um código promocional?").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(summary(page).getByText("- 0,087 ETH")).toBeVisible();
  await expect(summary(page).getByText("0,7854 ETH")).toBeVisible();
});

test("login une o carrinho do visitante, limita ao disponível e anuncia o ajuste", async ({ page }) => {
  await addToCart(page, "nft_012", 6);
  const guest = await guestOwner(page);

  await login(page, "ana@kurio.test", "/cart");
  await expect(page.getByText(/Unimos o carrinho de visitante ao seu\. 1 item foi ajustado/)).toBeAttached();
  await expectCartCount(page, 7);
  await expect(page.getByRole("group", { name: "Quantidade de Golden Pulse #402" })).toContainText("6");

  expect(await serverCart(page, "usr_ana")).toMatchObject({
    items: [
      { editionId: "ed_004_1", quantity: 1 },
      { editionId: "ed_012_1", quantity: 6 },
    ],
  });
  expect(await serverCart(page, guest)).toBeNull();
});

test("item acima do estoque avisa e se ajusta ao limite", async ({ page }) => {
  await login(page, "ana@kurio.test", "/cart");
  await expect(page.getByRole("group", { name: "Quantidade de Golden Pulse #402" })).toContainText("2");
  await page.evaluate(() => (window as unknown as KurioWindow).__kurio.catalog.setAvailable("nft_012", "ed_012_1", 1));
  await page.reload();

  await expect(page.getByText("Só resta 1 unidade para este pedido. Ajuste a quantidade.")).toBeVisible();
  await expect(summary(page)).toHaveAttribute("aria-busy", "false");
  await page.getByRole("button", { name: "Ajustar para 1" }).click();
  await expect(page.getByRole("group", { name: "Quantidade de Golden Pulse #402" })).toContainText("1");
  await expect(page.getByText("Só resta 1 unidade para este pedido. Ajuste a quantidade.")).toHaveCount(0);
  expect(await serverCart(page, "usr_ana")).toMatchObject({ items: [{ quantity: 1 }, { editionId: "ed_012_1", quantity: 1 }] });
});
