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

test.describe("bootstrap com armazenamento bloqueado", () => {
  test("mostra o aviso sem entrar em loop de recarga quando o localStorage é bloqueado", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Acesso bloqueado", "SecurityError");
        },
      });
    });
    let navigations = 0;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });

    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Não foi possível iniciar a demonstração" }),
    ).toBeVisible();
    await page.waitForLoadState("networkidle");
    expect(navigations).toBeLessThanOrEqual(2);
  });
});
