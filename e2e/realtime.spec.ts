import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, goToReview, login, startFresh } from "./support/kurio.js";

type Stats = { sockets: number; authenticated: number; subscriptions: number; delivered: number };

type KurioWindow = {
  __kurio: {
    catalog: { setPrice: (nftId: string, editionId: string, price: string) => void };
    realtime: { dropConnections: (options?: { reconnectAfterMs?: number }) => void; stats: () => Stats };
    sessions: { expire: (userId?: string) => void };
  };
};

function stats(page: Page): Promise<Stats> {
  return page.evaluate(() => (window as unknown as KurioWindow).__kurio.realtime.stats());
}

async function setPrice(page: Page, nftId: string, editionId: string, price: string): Promise<void> {
  await page.evaluate(
    ([nft, edition, value]) => (window as unknown as KurioWindow).__kurio.catalog.setPrice(nft, edition, value),
    [nftId, editionId, price],
  );
}

async function waitForSubscriptions(page: Page, minimum: number): Promise<void> {
  await expect.poll(async () => (await stats(page)).subscriptions).toBeGreaterThanOrEqual(minimum);
}

function summary(page: Page) {
  return page.getByRole("region", { name: "Resumo do pedido" });
}

test("evento de preço atualiza detalhe e catálogo abertos", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_001");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Emerald Ape #042");
  await waitForSubscriptions(page, 1);

  await setPrice(page, "nft_001", "ed_001_1", "2.5");
  await expect(page.getByLabel(/^Padrão · 2,5 ETH/)).toBeVisible();
  await expect(page.getByText("2,5 ETH", { exact: true })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("list", { name: "Resultados" }).getByRole("link").first()).toHaveText("Ivory Atlas #512");
  await waitForSubscriptions(page, 12);
  await setPrice(page, "nft_024", "ed_024_1", "0.3");
  await expect(page.getByRole("list", { name: "Resultados" }).getByRole("listitem").first()).toContainText("0,3 ETH");
});

test("mudança de preço no carrinho é anunciada e atualiza o resumo", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test", "/cart");
  await expect(summary(page).getByText("0,8724 ETH")).toBeVisible();
  await waitForSubscriptions(page, 2);

  await setPrice(page, "nft_004", "ed_004_1", "0.8");
  await expect(page.getByText("Preço alterado: de 0,75 para 0,8 ETH.")).toBeVisible();
  await expect(summary(page).getByText("0,9224 ETH")).toBeVisible();
  await expect(page.locator('[aria-live="polite"][aria-atomic="true"]')).toContainText("O preço ou a disponibilidade de Neon Vessel #552 mudou.");
  await expectNoA11yViolations(page);
});

test("evento duplicado ou antigo não regride o valor nem repete o anúncio", async ({ page }) => {
  await startFresh(page, "fast+socket-duplicates");
  await login(page, "ana@kurio.test", "/cart");
  await expect(summary(page).getByText("0,8724 ETH")).toBeVisible();
  await waitForSubscriptions(page, 2);
  await page.evaluate(() => {
    const region = document.querySelector('[aria-live="polite"][aria-atomic="true"]');
    const seen: string[] = [];
    (window as unknown as { announcements: string[] }).announcements = seen;
    new MutationObserver(() => {
      const text = region?.textContent ?? "";
      if (text.includes("mudou")) seen.push(text);
    }).observe(region!, { childList: true, subtree: true, characterData: true });
  });
  const before = (await stats(page)).delivered;

  await setPrice(page, "nft_004", "ed_004_1", "0.8");
  await expect(summary(page).getByText("0,9224 ETH")).toBeVisible();
  await setPrice(page, "nft_004", "ed_004_1", "0.85");
  await expect(summary(page).getByText("0,9724 ETH")).toBeVisible();

  await expect.poll(async () => (await stats(page)).delivered - before).toBe(5);
  await expect(page.getByText("Preço alterado: de 0,75 para 0,85 ETH.")).toBeVisible();
  await expect(summary(page).getByText("0,9724 ETH")).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { announcements: string[] }).announcements.length)).toBe(2);
});

test("queda do socket reconecta, reassina e reconcilia pelo REST", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_001");
  await waitForSubscriptions(page, 1);

  await page.evaluate(() => (window as unknown as KurioWindow).__kurio.realtime.dropConnections({ reconnectAfterMs: 2000 }));
  await expect.poll(async () => (await stats(page)).sockets).toBe(0);
  await setPrice(page, "nft_001", "ed_001_1", "2.9");

  await expect(page.getByLabel(/^Padrão · 2,9 ETH/)).toBeVisible({ timeout: 15_000 });
  await waitForSubscriptions(page, 1);
});

test("token recusado no handshake expira a sessão, não reconecta com ele e segue como visitante", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test", "/nft/nft_001");
  await expect.poll(async () => (await stats(page)).authenticated).toBe(1);
  await page.evaluate(() => (window as unknown as KurioWindow).__kurio.sessions.expire("usr_ana"));
  await page.reload();

  await expect(page.getByRole("dialog", { name: "Sua sessão expirou" })).toBeVisible();
  await expect.poll(async () => stats(page)).toMatchObject({ sockets: 1, authenticated: 0 });
  await waitForSubscriptions(page, 1);
  await setPrice(page, "nft_001", "ed_001_1", "2.6");
  await expect(page.getByLabel(/^Padrão · 2,6 ETH/)).toBeAttached();
  expect((await stats(page)).authenticated).toBe(0);
});

test("subscriptions são liberadas ao sair das telas com NFT", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_001");
  await waitForSubscriptions(page, 1);

  await page.getByRole("contentinfo").getByRole("link", { name: "Lista de interesse" }).click();
  await expect(page.getByRole("heading", { level: 1, name: /Lista de interesse em cunhagem/ })).toBeVisible();
  await expect.poll(async () => (await stats(page)).subscriptions).toBe(0);
  expect((await stats(page)).sockets).toBe(1);
});

test("a conexão sobrevive a 2 minutos com o heartbeat simulado", async ({ page }) => {
  await page.clock.install();
  await startFresh(page, "fast", "/nft/nft_001");
  await waitForSubscriptions(page, 1);

  await page.clock.runFor(120_000);

  expect((await stats(page)).sockets).toBe(1);
  await setPrice(page, "nft_001", "ed_001_1", "2.7");
  await expect(page.getByLabel(/^Padrão · 2,7 ETH/)).toBeVisible();
});

test("preço muda na revisão: diff, confirmar bloqueado até aceitar, e o pedido sai com o valor novo", async ({ page }) => {
  await startFresh(page, "fast+price-change-on-review");
  await login(page, "ana@kurio.test");
  await goToReview(page);

  await expect(page.getByText("Os valores mudaram desde a sua revisão.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Neon Vessel #552: de 0,75 para 0,8625 ETH")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeDisabled();

  await page.getByRole("button", { name: "Aceitar novos valores" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Seus NFTs agora estão na sua carteira" })).toBeVisible();
  await expect(page.getByText("0,9849 ETH").first()).toBeVisible();
});

test("queda do socket com pedido pendente: reload mantém o pedido e a reconexão traz o desfecho", async ({ page }) => {
  await startFresh(page, "socket-drop");
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pedido em processamento" })).toBeVisible();
  const orderUrl = page.url();

  await page.reload();
  expect(page.url()).toBe(orderUrl);
  await expect(page.getByRole("heading", { level: 1, name: /Pedido em processamento|Seus NFTs agora/ })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Seus NFTs agora estão na sua carteira" })).toBeVisible({ timeout: 15_000 });
  await expect.poll(async () => (await stats(page)).subscriptions).toBe(0);
});

test("estoque que muda na revisão sem mudar valores não pede novo aceite", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test");
  await goToReview(page);
  await waitForSubscriptions(page, 2);
  await page.evaluate(() =>
    (window as unknown as { __kurio: { catalog: { setAvailable: (n: string, e: string, a: number) => void } } }).__kurio.catalog.setAvailable("nft_004", "ed_004_1", 10),
  );

  await expect.poll(async () => (await stats(page)).delivered).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Confirmar compra" })).toBeEnabled();
  await expect(page.getByText("Os valores mudaram desde a sua revisão.")).toHaveCount(0);
});
