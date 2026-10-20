import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, login, startFresh } from "./support/kurio.js";

type Stats = { sockets: number; subscriptions: number; delivered: number };

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
  await expect(page.getByRole("list", { name: "Resultados" }).getByRole("link").first()).toHaveText("Mapa Proibido");
  await waitForSubscriptions(page, 12);
  await setPrice(page, "nft_024", "ed_024_1", "0.3");
  await expect(page.getByRole("list", { name: "Resultados" }).getByRole("listitem").first()).toContainText("A partir de 0,3 ETH");
});

test("mudança de preço no carrinho é anunciada e atualiza o resumo", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test", "/cart");
  await expect(summary(page).getByText("0,8724 ETH")).toBeVisible();
  await waitForSubscriptions(page, 2);

  await setPrice(page, "nft_004", "ed_004_1", "0.8");
  await expect(page.getByText("Preço alterado: de 0,75 para 0,8 ETH.")).toBeVisible();
  await expect(summary(page).getByText("0,9224 ETH")).toBeVisible();
  await expect(page.locator('[aria-live="polite"][aria-atomic="true"]')).toContainText("O preço ou a disponibilidade de Pulso Neon mudou.");
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

test("token recusado no handshake expira a sessão e não reconecta", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test");
  await page.evaluate(() => (window as unknown as KurioWindow).__kurio.sessions.expire("usr_ana"));
  await page.reload();

  await expect(page.getByRole("dialog", { name: "Sua sessão expirou" })).toBeVisible();
  await expect.poll(async () => (await stats(page)).sockets).toBe(0);
  await page.getByRole("dialog", { name: "Sua sessão expirou" }).getByRole("button").first().waitFor();
  expect((await stats(page)).sockets).toBe(0);
});

test("subscriptions são liberadas ao sair das telas com NFT", async ({ page }) => {
  await startFresh(page, "fast", "/nft/nft_001");
  await waitForSubscriptions(page, 1);

  await page.getByRole("link", { name: "Criadores" }).click();
  await expect(page.getByRole("heading", { name: "Seção fora da demonstração" })).toBeVisible();
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
