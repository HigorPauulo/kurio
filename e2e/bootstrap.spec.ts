import { expect, test } from "@playwright/test";

test.describe("bootstrap", () => {
  test.use({ serviceWorkers: "block" });

  test("avisa em vez de mostrar tela em branco quando o Service Worker é bloqueado", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Não foi possível iniciar a demonstração",
      }),
    ).toBeVisible();
  });
});
