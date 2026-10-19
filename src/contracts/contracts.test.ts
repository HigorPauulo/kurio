import { describe, expect, it } from "vitest";
import { ethAmountSchema } from "./common";
import { nftListQuerySchema } from "./nft";
import { createOrderBodySchema } from "./order";
import { realtimeEventSchema } from "./events";
import { emailSchema, ensNameSchema, passwordSchema, updateMeBodySchema } from "./user";
import { backupAddressSchema, referralCodeSchema } from "./wallet";

describe("ethAmountSchema", () => {
  it("aceita inteiros e até 18 casas decimais", () => {
    for (const value of ["0", "12.5", "0.000000000000000001"]) {
      expect(ethAmountSchema.safeParse(value).success).toBe(true);
    }
  });

  it("recusa zero à esquerda, ponto solto, sinal, notação científica e 19 casas", () => {
    for (const value of ["01", "1.", "-1", "1e3", "0.0000000000000000001", "1,5"]) {
      expect(ethAmountSchema.safeParse(value).success).toBe(false);
    }
  });
});

describe("campos do usuário", () => {
  it("grava o Nome ENS com o sufixo .eth, com ou sem ele na entrada", () => {
    expect(ensNameSchema.parse(" Ana ")).toBe("ana.eth");
    expect(ensNameSchema.parse("ana.eth")).toBe("ana.eth");
    expect(ensNameSchema.parse("nova-kurio")).toBe("nova-kurio.eth");
  });

  it("recusa Nome ENS curto, com hífen nas pontas ou caractere inválido", () => {
    for (const value of ["ab", "-ana", "ana-", "a_b", "ana!"]) {
      expect(ensNameSchema.safeParse(value).success).toBe(false);
    }
  });

  it("trata o Nome ENS apagado no perfil como null", () => {
    expect(updateMeBodySchema.parse({ ensName: "" })).toEqual({ ensName: null });
    expect(updateMeBodySchema.parse({ ensName: "Ana" })).toEqual({ ensName: "ana.eth" });
  });

  it("normaliza o e-mail para minúsculas sem espaços", () => {
    expect(emailSchema.parse("  Ana@Kurio.TEST ")).toBe("ana@kurio.test");
    expect(emailSchema.safeParse("ana@").success).toBe(false);
  });

  it("exige senha com letra e número, de 8 a 72 caracteres", () => {
    expect(passwordSchema.safeParse("Kurio@2026").success).toBe(true);
    expect(passwordSchema.safeParse("somenteletras").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("a1").success).toBe(false);
  });
});

describe("campos da carteira", () => {
  it("grava o código de indicação em maiúsculas", () => {
    expect(referralCodeSchema.parse("kurio26")).toBe("KURIO26");
    expect(referralCodeSchema.safeParse("ab12").success).toBe(false);
  });

  it("aceita carteira secundária vazia, endereço 0x ou nome .eth", () => {
    expect(backupAddressSchema.parse(null)).toBeNull();
    expect(backupAddressSchema.parse("")).toBeNull();
    expect(backupAddressSchema.parse("   ")).toBeNull();
    expect(backupAddressSchema.safeParse(`0x${"a".repeat(40)}`).success).toBe(true);
    expect(backupAddressSchema.safeParse("nova.eth").success).toBe(true);
    expect(backupAddressSchema.safeParse("nova").success).toBe(false);
  });
});

describe("nftListQuerySchema", () => {
  it("lê listas separadas por vírgula e números vindos da URL, com padrões", () => {
    expect(nftListQuerySchema.parse({ category: "music,gaming", page: "2" })).toEqual({
      category: ["music", "gaming"],
      page: 2,
      pageSize: 12,
      sort: "recent",
    });
  });

  it("exige preço mínimo menor ou igual ao máximo, com comparação exata", () => {
    expect(nftListQuerySchema.safeParse({ priceMin: "5", priceMax: "1" }).success).toBe(false);
    expect(nftListQuerySchema.safeParse({ priceMin: "1", priceMax: "1.0" }).success).toBe(true);
    expect(
      nftListQuerySchema.safeParse({
        priceMin: "0.100000000000000001",
        priceMax: "0.1",
      }).success,
    ).toBe(false);
  });

  it("recusa categoria fora da lista e página maior que 48 itens", () => {
    expect(nftListQuerySchema.safeParse({ category: "music,arte" }).success).toBe(false);
    expect(nftListQuerySchema.safeParse({ pageSize: "49" }).success).toBe(false);
  });
});

describe("createOrderBodySchema", () => {
  it("limita a observação a 500 caracteres", () => {
    const body = { quoteId: "qte_1", walletId: "wal_1", network: "base" };
    expect(createOrderBodySchema.safeParse({ ...body, note: "a".repeat(500) }).success).toBe(true);
    expect(createOrderBodySchema.safeParse({ ...body, note: "a".repeat(501) }).success).toBe(false);
  });
});

describe("realtimeEventSchema", () => {
  it("separa nft.updated de order.updated pelo tipo", () => {
    const event = realtimeEventSchema.parse({
      id: "evt_1",
      type: "nft.updated",
      resource: { kind: "nft", id: "nft_001" },
      version: 3,
      audience: null,
      occurredAt: "2026-10-19T12:00:00.000Z",
      data: {
        nftId: "nft_001",
        priceFrom: "0.5",
        editions: [{ editionId: "ed_1", price: "0.5", available: 2, status: "available" }],
      },
    });

    expect(event.type).toBe("nft.updated");
  });
});
