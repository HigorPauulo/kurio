import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoA11yViolations, startFresh } from "./support/kurio.js";

type KurioWindow = {
  __kurio: {
    scenario: { set: (presets: string) => void };
    inspect: { lastRequest: (pattern: string) => { query: Record<string, string> } | null };
  };
};

async function openFilters(page: Page): Promise<Locator> {
  const trigger = page.getByRole("button", { name: "Filtros", exact: true });
  if (await trigger.isVisible()) await trigger.click();
  return page.getByRole("form", { name: "Filtros" });
}

function results(page: Page): Locator {
  return page.getByRole("list", { name: "Resultados" }).getByRole("link");
}

async function lastListQuery(page: Page): Promise<Record<string, string> | undefined> {
  return page.evaluate(() => (window as unknown as KurioWindow).__kurio.inspect.lastRequest("^/api/nfts\\?")?.query);
}

test("filtros, ordenação e página vivem na URL e sobrevivem a refresh, voltar e avançar", async ({ page }) => {
  await startFresh(page);
  await expect(results(page)).toHaveCount(12);
  await expectNoA11yViolations(page);

  await page.getByRole("link", { name: "Página 2" }).click();
  await expect(page).toHaveURL(/[?&]page=2/);
  await expect(results(page)).toHaveCount(12);

  const filters = await openFilters(page);
  await filters.getByLabel("Música").check();
  await filters.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/[?&]category=music/);
  await expect(page).not.toHaveURL(/page=/);
  await expect(results(page)).toHaveCount(3);
  expect(await lastListQuery(page)).toMatchObject({ category: "music", pageSize: "12" });

  await page.getByLabel("Ordenar por").selectOption("price_asc");
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(results(page).first()).toHaveText("Lo-fi Noturno");
  expect(await lastListQuery(page)).toMatchObject({ category: "music", sort: "price_asc" });

  await page.reload();
  await expect(page.getByLabel("Ordenar por")).toHaveValue("price_asc");
  await expect(results(page).first()).toHaveText("Lo-fi Noturno");
  await expect(results(page)).toHaveCount(3);

  await page.goBack();
  await expect(page).not.toHaveURL(/sort=/);
  await expect(page.getByLabel("Ordenar por")).toHaveValue("recent");
  await page.goForward();
  await expect(page.getByLabel("Ordenar por")).toHaveValue("price_asc");

  await page.getByLabel("Buscar NFTs").fill("vinil");
  await expect(page).toHaveURL(/q=vinil/);
  await expect(results(page)).toHaveText(["Vinil Raro"]);
});

test("preço digitado com vírgula vai à URL com ponto, e faixa invertida é recusada no campo", async ({ page }) => {
  await startFresh(page);
  await expect(results(page)).toHaveCount(12);

  let filters = await openFilters(page);
  await filters.getByLabel("Preço mínimo").fill("5");
  await filters.getByLabel("Preço máximo").fill("1");
  await filters.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(filters.getByText("O preço máximo deve ser maior ou igual ao mínimo.")).toBeVisible();

  await filters.getByLabel("Preço mínimo").fill("0,01");
  await filters.getByLabel("Preço máximo").fill("0,1");
  await filters.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/priceMin=0\.01&priceMax=0\.1|priceMax=0\.1.*priceMin=0\.01/);
  await expect(results(page).first()).toBeVisible();

  filters = await openFilters(page);
  await expect(filters.getByLabel("Preço mínimo")).toHaveValue("0,01");

  await filters.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page).not.toHaveURL(/price(Min|Max)=/);
  await expect(results(page)).toHaveCount(12);
});

test("resposta antiga que chega por último é descartada", async ({ page }) => {
  await startFresh(page);
  await expect(results(page)).toHaveCount(12);

  await page.evaluate(() => (window as unknown as KurioWindow).__kurio.scenario.set("out-of-order"));
  await page.clock.install();

  await page.getByLabel("Ordenar por").selectOption("price_asc");
  await page.getByLabel("Ordenar por").selectOption("popular");
  await page.clock.runFor(3500);

  await expect(page.getByRole("status").filter({ hasText: "NFTs encontrados" })).toBeVisible();
  await expect(results(page).first()).toHaveText("Campo Gerado #7");
  await expect(page).toHaveURL(/sort=popular/);
});

test("detalhe por acesso direto: galeria, edição na URL e quantidade limitada", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_001");
  await expect(page.getByRole("heading", { level: 1, name: "Emerald Ape #042" })).toBeVisible();
  await expectNoA11yViolations(page);

  const secondImage = page.getByRole("button", { name: "Ver imagem 2 de 2" });
  await secondImage.click();
  await expect(secondImage).toHaveAttribute("aria-pressed", "true");

  const increase = page.getByRole("button", { name: "Aumentar quantidade" });
  await increase.click();
  await increase.click();
  await expect(page.getByRole("spinbutton", { name: "Quantidade" })).toHaveValue("3");
  await expect(increase).toBeDisabled();

  const quantity = page.getByRole("spinbutton", { name: "Quantidade" });
  await quantity.fill("");
  await quantity.pressSequentially("2");
  await expect(quantity).toHaveValue("2");
  await quantity.fill("9");
  await quantity.blur();
  await expect(quantity).toHaveValue("3");

  await page.getByLabel(/^Ouro/).check();
  await expect(page).toHaveURL(/edition=ed_001_2/);
  await expect(page.getByRole("spinbutton", { name: "Quantidade" })).toHaveValue("1");
  await expect(increase).toBeDisabled();

  await page.reload();
  await expect(page.getByLabel(/^Ouro/)).toBeChecked();
});

test("edição esgotada e indisponível ficam bloqueadas com o motivo", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_008");
  const lifetime = page.getByLabel(/^Vitalício/);
  await expect(lifetime).toBeDisabled();
  await expect(page.getByText("Indisponível: esta edição não está à venda.")).toBeVisible();

  await page.goto("/nft/nft_004?edition=ed_004_2");
  await expect(page.getByLabel(/^Edição da artista/)).toBeDisabled();
  await expect(page.getByRole("alert")).toHaveText("Esgotada: não há unidades disponíveis.");
  await expect(page.getByRole("spinbutton", { name: "Quantidade" })).toHaveCount(0);
});

test("NFT inexistente e rota inexistente mostram não encontrado", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_999");
  await expect(page.getByRole("heading", { name: "NFT não encontrado" })).toBeVisible();

  await page.goto("/rota/que/nao/existe");
  await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
});
