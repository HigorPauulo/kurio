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

async function searchFor(page: Page, text: string): Promise<void> {
  const toggle = page.getByRole("button", { name: "Abrir a busca" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByLabel("Buscar NFTs").fill(text);
  await page.getByLabel("Buscar NFTs").press("Enter");
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
  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page).toHaveURL(/[?&]category=music/);
  await expect(page).not.toHaveURL(/page=/);
  await expect(results(page)).toHaveCount(3);
  expect(await lastListQuery(page)).toMatchObject({ category: "music", pageSize: "12" });

  await page.getByLabel("Ordenar por").selectOption("price_asc");
  await expect(page).toHaveURL(/sort=price_asc/);
  await expect(results(page).first()).toHaveText("Golden Pulse #402");
  expect(await lastListQuery(page)).toMatchObject({ category: "music", sort: "price_asc" });

  await page.reload();
  await expect(page.getByLabel("Ordenar por")).toHaveValue("price_asc");
  await expect(results(page).first()).toHaveText("Golden Pulse #402");
  await expect(results(page)).toHaveCount(3);

  await page.goBack();
  await expect(page).not.toHaveURL(/sort=/);
  await expect(page.getByLabel("Ordenar por")).toHaveValue("recent");
  await page.goForward();
  await expect(page.getByLabel("Ordenar por")).toHaveValue("price_asc");

  await searchFor(page, "groove");
  await expect(page).toHaveURL(/q=groove/);
  await expect(results(page)).toHaveText(["Violet Groove #045"]);
  await page.getByRole("button", { name: "Limpar a busca por groove" }).click();
  await expect(page).not.toHaveURL(/q=/);
});

test("faixa de preço pelo controle deslizante vai à URL em ETH com ponto, e o mínimo não passa do máximo", async ({ page }) => {
  await startFresh(page);
  await expect(results(page)).toHaveCount(12);

  let filters = await openFilters(page);
  await expect(filters.getByText("Preço: 0,001 - 12,5 ETH")).toBeVisible();
  await expect(filters.getByLabel("Música")).toHaveAccessibleName("Música, 3 NFTs");

  const max = filters.getByLabel("Preço máximo");
  await max.focus();
  await page.keyboard.press("Home");
  for (let step = 0; step < 9; step += 1) await page.keyboard.press("ArrowRight");
  await expect(max).toHaveAttribute("aria-valuetext", "0,01 ETH");

  const min = filters.getByLabel("Preço mínimo");
  await min.focus();
  await page.keyboard.press("End");
  await expect(min).toHaveAttribute("aria-valuetext", "0,01 ETH");
  await page.keyboard.press("Home");

  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page).toHaveURL(/[?&]priceMax=0\.01(&|$)/);
  await expect(page).not.toHaveURL(/priceMin=/);
  await expect(results(page)).toHaveText(["Emerald Relic #198", "Golden Frequency #071"]);
  expect(await lastListQuery(page)).toMatchObject({ priceMax: "0.01" });

  await page.reload();
  await expect(results(page)).toHaveCount(2);
  filters = await openFilters(page);
  await expect(filters.getByText("Preço: 0,001 - 0,01 ETH")).toBeVisible();
  await filters.getByLabel("Preço máximo").focus();
  await page.keyboard.press("End");
  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
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
  await expect(results(page).first()).toHaveText("Golden Beat #207");
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

test("carrossel do hero gira sozinho, pausa e troca de slide ao arrastar", async ({ page }) => {
  await page.clock.install();
  await startFresh(page);
  const carousel = page.locator('section[aria-roledescription="carrossel"]');
  const current = carousel.locator('[aria-current="true"]');
  await expect(current).toHaveAccessibleName("Mostrar o slide 1 de 3");

  await page.clock.fastForward(6000);
  await expect(current).toHaveAccessibleName("Mostrar o slide 2 de 3");

  await carousel.getByRole("button", { name: "Pausar o carrossel" }).click();
  await page.mouse.move(0, 0);
  await page.clock.fastForward(12_000);
  await expect(current).toHaveAccessibleName("Mostrar o slide 2 de 3");

  const box = await carousel.boundingBox();
  if (!box) throw new Error("Carrossel sem caixa");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.7, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, y, { steps: 8 });
  await page.mouse.up();
  await expect(current).toHaveAccessibleName("Mostrar o slide 3 de 3");
  await expect(page).not.toHaveURL(/#mercado/);
});

test("abas filtram em alta e novos lançamentos, e filtrar não volta ao topo da página", async ({ page }) => {
  await startFresh(page);
  await expect(results(page)).toHaveCount(12);

  const trending = page.getByRole("link", { name: "Em alta" });
  await trending.evaluate((tab) => window.scrollBy(0, tab.getBoundingClientRect().top - 80));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  expect(scrollBefore).toBeGreaterThan(0);

  await trending.click();
  await expect(page).toHaveURL(/view=trending/);
  await expect(results(page)).toHaveCount(6);
  expect(await lastListQuery(page)).toMatchObject({ view: "trending" });
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.getByRole("link", { name: "Novos lançamentos" }).click();
  await expect(page).toHaveURL(/view=new/);
  await expect(results(page)).toHaveCount(8);

  await page.getByRole("link", { name: "Todos os NFTs" }).click();
  await expect(page).not.toHaveURL(/view=/);
  await expect(results(page)).toHaveCount(12);
});

test("marcar um filtro pelo teclado na barra lateral mantém o foco no item", async ({ page, isMobile }) => {
  test.skip(isMobile, "no celular os filtros abrem em diálogo e aplicam no botão");
  await startFresh(page);
  await expect(results(page)).toHaveCount(12);

  const music = page.getByRole("checkbox", { name: /Música/ });
  await music.focus();
  await page.keyboard.press("Space");
  await expect(page).toHaveURL(/category=music/);
  await expect(music).toBeChecked();
  await expect(music).toBeFocused();

  await page.keyboard.press("Space");
  await expect(page).not.toHaveURL(/category=/);
  await expect(music).toBeFocused();
});

test("galeria navega por setas, miniatura e teclado, e a lupa abre o mesmo carrossel", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_018");
  const gallery = page.getByRole("group", { name: "Imagens de Emerald Pass #303" });
  const counter = gallery.getByText(/^\d+ \/ 6$/);
  await expect(page.getByRole("list", { name: "Galeria" }).getByRole("button")).toHaveCount(6);
  await expect(counter).toHaveText("1 / 6");

  await gallery.getByRole("button", { name: "Imagem anterior" }).click();
  await expect(counter).toHaveText("6 / 6");
  await page.getByRole("button", { name: "Ver imagem 3 de 6" }).click();
  await expect(counter).toHaveText("3 / 6");
  await gallery.getByRole("button", { name: "Próxima imagem" }).press("ArrowRight");
  await expect(counter).toHaveText("4 / 6");

  await gallery.getByRole("button", { name: "Ampliar a imagem" }).click();
  const zoom = page.getByRole("dialog");
  await expect(zoom.getByText("4 / 6")).toBeVisible();
  await zoom.getByRole("button", { name: "Próxima imagem" }).click();
  await expect(zoom.getByText("5 / 6")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(counter).toHaveText("5 / 6");

  await page.goto("/nft/nft_004");
  await expect(page.getByRole("list", { name: "Galeria" }).getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Próxima imagem" })).toHaveCount(0);
});

test("mais desta coleção mostra os outros NFTs da coleção e leva ao detalhe", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_001");
  const rail = page.getByRole("region", { name: "Mais desta coleção" });
  const cards = rail.getByRole("list", { name: "NFTs da mesma coleção" }).getByRole("link");
  await expect(cards).toHaveText(["Emerald Cube #880", "Emerald Pass #303", "Emerald Relic #198", "Emerald Drift #215"]);
  expect(await page.evaluate(() => (window as unknown as KurioWindow).__kurio.inspect.lastRequest("^/api/nfts\\?")?.query)).toMatchObject({
    collection: "col_kurio-apes",
  });

  await cards.filter({ hasText: "Emerald Pass #303" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Emerald Pass #303");
  await expect(rail.getByRole("link").filter({ hasText: "Emerald Ape #042" })).toBeVisible();
});

test("aba de avaliações mostra o resumo igual à nota do NFT e carrega mais avaliações", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_001");
  await expect(page.getByText("19 avaliações de colecionadores")).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText("Descrição:");

  await page.getByRole("tab", { name: "Avaliações de colecionadores (19)" }).click();
  const panel = page.getByRole("tabpanel");
  await expect(panel.getByText("4,5", { exact: true })).toBeVisible();
  await expect(panel.getByRole("list", { name: "Avaliações" }).getByRole("listitem")).toHaveCount(5);
  await expectNoA11yViolations(page);

  await panel.getByRole("button", { name: "Ver mais avaliações" }).click();
  await expect(panel.getByRole("list", { name: "Avaliações" }).getByRole("listitem")).toHaveCount(10);
  await expect(panel.getByText("Mostrando 10 de 19 avaliações")).toBeVisible();
});
