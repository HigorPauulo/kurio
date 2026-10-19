import { expect, test } from "@playwright/test";
import { expectNoA11yViolations, login, startFresh } from "./support/kurio.js";

const PNG_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await startFresh(page);
});

test("perfil mostra os campos do layout, o de outra tela somente leitura, e persiste no reload", async ({
  page,
}) => {
  await login(page, "ana@kurio.test", "/account/profile");

  await expect(page.getByLabel("Nome ENS")).toHaveValue("ana");
  const walletLabel = page.getByLabel("Apelido da carteira");
  await expect(walletLabel).toHaveValue("Principal");
  await expect(walletLabel).toHaveAttribute("readonly");
  await expect(page.getByRole("link", { name: "Editar em Carteiras" })).toBeVisible();
  await expectNoA11yViolations(page);

  await page.getByLabel("Nome de exibição").fill("Ana Lima Souza");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Ana Lima Souza");
});

test("erro da API aparece no campo, e senha atual errada é recusada", async ({ page }) => {
  await login(page, "ana@kurio.test", "/account/profile");

  await page.getByLabel("Nome de usuário").fill("bruno");
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page.getByText("Este nome de usuário já está em uso.")).toBeVisible();
  await expect(page.getByLabel("Nome de usuário")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Senha atual").fill("Errada123");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha1");
  await page.getByLabel("Confirmar nova senha").fill("NovaSenha1");
  await page.getByRole("button", { name: "Alterar senha" }).click();
  await expect(page.getByText("A senha atual está incorreta.")).toBeVisible();
});

test("avatar enviado aparece e persiste", async ({ page }) => {
  await login(page, "ana@kurio.test", "/account/profile");

  await page.getByLabel("Alterar avatar").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: PNG_PIXEL,
  });
  await expect(page.getByRole("img", { name: "Avatar de Ana Lima" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("img", { name: "Avatar de Ana Lima" })).toBeVisible();
});

test("carteiras mostram os campos do layout e salvam a edição", async ({ page }) => {
  await login(page, "ana@kurio.test", "/account/wallets");
  const primary = page.getByRole("form", { name: "Carteira principal" });

  await expect(primary.getByLabel("E-mail")).toHaveValue("ana@kurio.test");
  await expect(primary.getByLabel("E-mail")).toHaveAttribute("readonly");
  await expect(primary.getByLabel("Nome ENS")).toHaveValue("ana.eth");
  await expect(primary.getByRole("link", { name: "Editar no Perfil" })).toHaveCount(3);
  await expectNoA11yViolations(page);

  await primary.getByLabel("Apelido da carteira").fill("Principal nova");
  await primary.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(primary.getByText("Carteira salva.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("form", { name: "Carteira principal" }).getByLabel("Apelido da carteira")).toHaveValue(
    "Principal nova",
  );
});

test("Bruno cadastra a carteira principal com validação de cada campo", async ({ page }) => {
  await login(page, "bruno@kurio.test", "/account/wallets");
  const primary = page.getByRole("form", { name: "Carteira principal" });

  await primary.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(primary.getByText("Escolha ao menos uma rede.")).toBeVisible();
  await expect(primary.getByText(/Endereço inválido/)).toBeVisible();
  await expectNoA11yViolations(page);

  await primary.getByLabel("Apelido da carteira").fill("Carteira do Bruno");
  await primary.getByLabel("Base").check();
  await primary.getByLabel("Nome do perfil").fill("Bruno colecionador");
  await primary.getByLabel("Endereço da carteira").fill(`0x${"b".repeat(40)}`);
  await primary.getByLabel("Código de indicação").fill("bruno26");
  await primary.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(primary.getByText("Carteira salva.")).toBeVisible();

  await page.reload();
  const saved = page.getByRole("form", { name: "Carteira principal" });
  await expect(saved.getByLabel("Código de indicação")).toHaveValue("BRUNO26");
  await expect(saved.getByLabel("Base")).toBeChecked();
});
