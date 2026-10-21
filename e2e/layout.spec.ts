import { expect, test, type Page } from "@playwright/test";
import { expectNoA11yViolations, login, startFresh } from "./support/kurio.js";

const PUBLIC_ROUTES = ["/", "/nft/nft_001", "/cart", "/unavailable?from=criadores", "/login", "/register", "/rota-inexistente"];
const PRIVATE_ROUTES = ["/checkout", "/account/profile", "/account/wallets"];

async function expectNoHorizontalOverflow(page: Page, width: number): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth, `largura do documento em ${page.url()}`).toBeLessThanOrEqual(width);
}

async function visitAll(page: Page, routes: string[]): Promise<void> {
  const width = page.viewportSize()?.width ?? 0;
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("main h1, [role=dialog]").first()).toBeAttached();
    await expect(page.locator("[aria-busy=true]")).toHaveCount(0);
    await expectNoHorizontalOverflow(page, width);
  }
}

test("nenhuma rota pública estoura a largura e o início passa no axe", async ({ page }) => {
  await startFresh(page);
  await expectNoA11yViolations(page);
  await visitAll(page, PUBLIC_ROUTES);
});

test("rotas privadas não estouram a largura", async ({ page }) => {
  await startFresh(page);
  await login(page, "ana@kurio.test", "/account/profile");
  await expectNoA11yViolations(page);
  await visitAll(page, PRIVATE_ROUTES);
});

for (const width of [768, 1024]) {
  test(`em ${width} nenhuma rota estoura a largura`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    await startFresh(page);
    await visitAll(page, PUBLIC_ROUTES);
    await login(page, "ana@kurio.test", "/account/wallets");
    await visitAll(page, PRIVATE_ROUTES);
  });
}

test("skeleton tem dimensões finais e para o shimmer com movimento reduzido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startFresh(page, "slow");
  const skeleton = page.locator(".skeleton").first();
  await expect(skeleton).toBeVisible();
  const style = await skeleton.evaluate((element) => {
    const computed = getComputedStyle(element);
    return { animation: computed.animationName, image: computed.backgroundImage, height: element.getBoundingClientRect().height };
  });
  expect(style).toMatchObject({ animation: "none", image: "none" });
  expect(style.height).toBeGreaterThan(100);
});
