import { expect, test } from "@playwright/test";

test.describe("spike: Socket.IO sobre MSW", () => {
  test("pergunta 1: conecta e o servidor simulado responde", async ({
    page,
  }) => {
    await page.goto("/dev/realtime");

    await expect(page.getByText("Status: conectado")).toBeVisible();
    await expect(
      page.getByText("pergunta 1: olá do servidor simulado"),
    ).toBeVisible();
  });

  test("pergunta 2: ack chega ao cliente", async ({ page }) => {
    await page.goto("/dev/realtime");
    await expect(page.getByText("Status: conectado")).toBeVisible();

    await page.getByRole("button", { name: /Pergunta 2/ }).click();

    await expect(page.getByText(/pergunta 2: ack .*"ok":true/)).toBeVisible();
  });

  test("pergunta 3: token inválido recebe connect_error e não reconecta", async ({
    page,
  }) => {
    await page.goto("/dev/realtime");
    await expect(page.getByText("Status: conectado")).toBeVisible();

    const probeButton = page.getByRole("button", { name: /Pergunta 3/ });
    await probeButton.click();

    await expect(probeButton).toBeDisabled();
    await expect(
      page.getByText(/connect_error "SESSION_EXPIRED", code=SESSION_EXPIRED/),
    ).toBeVisible();
    await expect(page.getByText(/após 5 s, .*tentativas=0/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/tentativa de reconexão/)).toHaveCount(0);
    await expect(probeButton).toBeEnabled();
  });

  test("pergunta 5: a conexão sobrevive a 2 minutos de relógio falso", async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto("/dev/realtime");
    await expect(page.getByText("Status: conectado")).toBeVisible();

    await page.clock.runFor(120_000);

    await expect(page.getByText("Status: conectado")).toBeVisible();
    await expect(page.getByText(/queda da conexão principal/)).toHaveCount(0);

    await page.getByRole("button", { name: /Pergunta 2/ }).click();
    await expect(page.getByText(/pergunta 2: ack .*"ok":true/)).toBeVisible();
  });
});
