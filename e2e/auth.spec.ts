import { expect, test } from "@playwright/test";
import { expectLoggedIn, expectNoA11yViolations, login, logout, openAccount, openLogin, PASSWORD, startFresh } from "./support/kurio.js";

test.beforeEach(async ({ page }) => {
  await startFresh(page);
});

test("cadastro confere a confirmação de senha, mostra conflito no campo e entra com a conta nova", async ({
  page,
}) => {
  await page.goto("/register");
  const dialog = page.getByRole("dialog", { name: "Criar conta" });
  await expect(dialog).toBeVisible();
  await expectNoA11yViolations(page);
  await dialog.getByLabel("Nome de usuário").fill("carla");
  await dialog.getByLabel("E-mail").fill("nova@kurio.test");
  await dialog.getByLabel("Senha", { exact: true }).fill("Senha123");
  await dialog.getByLabel("Confirmar senha").fill("Outra123");
  await dialog.getByRole("button", { name: "Criar conta" }).click();
  await expect(dialog.getByText("As senhas não conferem.")).toBeVisible();

  await dialog.getByLabel("Confirmar senha").fill("Senha123");
  await dialog.getByRole("button", { name: "Criar conta" }).click();
  await expect(dialog.getByText("Este nome de usuário já está em uso.")).toBeVisible();
  await expect(dialog.getByLabel("Nome de usuário")).toHaveAttribute("aria-invalid", "true");

  await dialog.getByLabel("Nome de usuário").fill("dani");
  await dialog.getByRole("button", { name: "Criar conta" }).click();
  await expectLoggedIn(page);
});

test("login com senha errada avisa sem entrar", async ({ page }) => {
  await page.goto("/login");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("E-mail").fill("ana@kurio.test");
  await dialog.getByLabel("Senha").fill("Errada123");
  await dialog.getByRole("button", { name: "Entrar" }).click();

  await expect(dialog.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expectNoA11yViolations(page);
});

test("rota privada sem sessão leva ao login e volta ao destino", async ({ page }) => {
  await page.goto("/account/profile");
  await expect(page).toHaveURL(/\/\?auth=login&redirect=%2Faccount%2Fprofile/);

  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("E-mail").fill("ana@kurio.test");
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();
});

test("voltar depois de entrar não reabre o login e sair não deixa dados no formulário", async ({ page }) => {
  await page.goto("/account/profile");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("E-mail").fill("ana@kurio.test");
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Perfil do colecionador" })).toBeVisible();

  await page.goBack();
  await expectLoggedIn(page);

  await logout(page);
  await openLogin(page);
  await expect(dialog.getByLabel("E-mail")).toHaveValue("");
  await expect(dialog.getByLabel("Senha")).toHaveValue("");
});

test("entrar por uma página pública mantém a página por trás e fechar volta para ela", async ({ page }) => {
  await page.goto("/nft/nft_001");
  await page.getByRole("link", { name: /Favoritar/ }).click();

  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/nft\/nft_001\?auth=login$/);
  await expect(page.locator("main h1")).toHaveText("Emerald Ape #042");

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/nft\/nft_001$/);

  await page.getByRole("link", { name: /Favoritar/ }).click();
  await dialog.getByLabel("E-mail").fill("ana@kurio.test");
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/nft\/nft_001$/);
  await expect(page.getByRole("button", { name: "Favoritar" })).toBeVisible();
});

test("fechar o login aberto por rota privada não prende o usuário no diálogo", async ({ page }) => {
  await page.goto("/account/wallets");
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test("redirect para fora do site cai no início", async ({ page }) => {
  await login(page, "ana@kurio.test", "/\\evil.com");

  const url = new URL(page.url());
  expect(url.pathname).toBe("/");
  expect(url.host).toBe("localhost:4173");
});

test("expiração no meio do fluxo mostra o diálogo e o login de novo volta ao mesmo lugar", async ({ page }) => {
  await login(page, "ana@kurio.test", "/account/profile");
  await page.evaluate(() =>
    (window as unknown as { __kurio: { sessions: { expire: (id: string) => void } } }).__kurio.sessions.expire(
      "usr_ana",
    ),
  );

  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  const expired = page.getByRole("dialog", { name: "Sua sessão expirou" });
  await expect(expired).toBeVisible();
  await expectNoA11yViolations(page);

  await expired.getByRole("button", { name: "Entrar de novo" }).click();
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("E-mail").fill("ana@kurio.test");
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Entrar" }).click();

  await expect(page).toHaveURL(/\/account\/profile$/);
  await expect(page.getByRole("dialog", { name: "Sua sessão expirou" })).toHaveCount(0);
});

test("sessão que o servidor esqueceu leva ao aviso de expiração, não a uma tela presa", async ({ page }) => {
  await login(page, "ana@kurio.test", "/account/profile");
  await page.evaluate(() => (window as unknown as { __kurio: { reset: () => void } }).__kurio.reset());

  await page.getByRole("button", { name: "Salvar", exact: true }).click();

  await expect(page.getByRole("dialog", { name: "Sua sessão expirou" })).toBeVisible();
});

test("troca de Ana para Bruno sem recarregar não deixa nenhum dado da Ana na tela", async ({ page }) => {
  const accountNav = page.getByRole("navigation", { name: "Conta" });
  await login(page, "ana@kurio.test", "/account/profile");
  await expect(page.getByLabel("Apelido da carteira")).toHaveValue("Principal");
  await accountNav.getByRole("link", { name: "Carteiras" }).click();
  await expect(page.getByRole("form", { name: "Carteira principal" }).getByLabel("Apelido da carteira")).toHaveValue(
    "Principal",
  );
  await logout(page);

  await openLogin(page);
  const dialog = page.getByRole("dialog", { name: "Entrar" });
  await dialog.getByLabel("E-mail").fill("bruno@kurio.test");
  await dialog.getByLabel("Senha").fill(PASSWORD);
  await dialog.getByRole("button", { name: "Entrar" }).click();
  await expectLoggedIn(page);

  await openAccount(page);
  await expect(page.getByLabel("E-mail")).toHaveValue("bruno@kurio.test");
  await accountNav.getByRole("link", { name: "Carteiras" }).click();
  await expect(page.getByText("Você ainda não adicionou uma carteira secundária.")).toBeVisible();

  const visibleText = await page.locator("body").innerText();
  const visibleValues = await page.locator("input").evaluateAll((inputs) =>
    inputs.map((input) => (input as HTMLInputElement).value).join(" "),
  );
  for (const anaData of ["ana@kurio.test", "Ana Lima", "ana.eth", "Principal"]) {
    expect(`${visibleText} ${visibleValues}`).not.toContain(anaData);
  }
});
