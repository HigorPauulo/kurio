import { describe, expect, it } from "vitest";
import { safeRedirect } from "./safeRedirect";

const ORIGIN = "https://kurio-beta.vercel.app";

describe("safeRedirect", () => {
  it("aceita caminho interno com busca e âncora", () => {
    expect(safeRedirect("/checkout?step=review#resumo", ORIGIN)).toBe("/checkout?step=review#resumo");
    expect(safeRedirect("/account/profile", ORIGIN)).toBe("/account/profile");
  });

  it("recusa origem externa, protocolo relativo, barra invertida e esquema perigoso", () => {
    for (const value of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "javascript:alert(1)",
      "evil.com",
    ]) {
      expect(safeRedirect(value, ORIGIN)).toBe("/");
    }
  });

  it("recusa caractere de controle, vazio e valor que não é texto", () => {
    expect(safeRedirect("/conta\n/evil", ORIGIN)).toBe("/");
    expect(safeRedirect("", ORIGIN)).toBe("/");
    expect(safeRedirect(undefined, ORIGIN)).toBe("/");
    expect(safeRedirect(42, ORIGIN)).toBe("/");
  });
});
