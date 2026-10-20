import { expect, test, type Page } from "@playwright/test";

type KurioWindow = {
  __kurio: {
    build: string;
    reset: () => void;
    scenario: { get: () => string };
    catalog: { setPrice: (nftId: string, editionId: string, price: string) => void };
  };
};

const DB_KEY = "kurio:mockdb:v4";

async function waitForMocks(page: Page): Promise<void> {
  await page.waitForFunction(() => "__kurio" in window);
}

function readScenario(page: Page): Promise<string> {
  return page.evaluate(() => (window as unknown as KurioWindow).__kurio.scenario.get());
}

function readSnapshot(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), DB_KEY);
}

test.describe("mocks", () => {
  test("aplica o cenário da URL, limpa a URL e expõe o SHA do build", async ({ page }) => {
    await page.goto("/?scenario=fast&reset=1");
    await waitForMocks(page);

    await expect.poll(() => readScenario(page)).toBe("fast");
    expect(new URL(page.url()).search).toBe("");
    const build = await page.evaluate(() => (window as unknown as KurioWindow).__kurio.build);
    expect(build).toMatch(/^[0-9a-f]{40}$|^local$/);
  });

  test("mantém o cenário e o banco depois do reload, e o reset volta ao seed e ao cenário padrão", async ({ page }) => {
    await page.goto("/?scenario=fast&reset=1");
    await waitForMocks(page);
    await expect.poll(() => readScenario(page)).toBe("fast");

    await page.evaluate(() =>
      (window as unknown as KurioWindow).__kurio.catalog.setPrice("nft_001", "ed_001_1", "1.99"),
    );
    await page.reload();
    await waitForMocks(page);

    await expect.poll(() => readScenario(page)).toBe("fast");
    expect(await readSnapshot(page)).toContain('"price":"1.99"');

    await page.evaluate(() => (window as unknown as KurioWindow).__kurio.reset());
    expect(await readSnapshot(page)).toBeNull();
    expect(await readScenario(page)).toBe("default");
  });
});
