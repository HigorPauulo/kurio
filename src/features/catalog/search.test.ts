import { describe, expect, it } from "vitest";
import { parseCatalogSearch, pickCatalogSearch } from "./search";

describe("parseCatalogSearch", () => {
  it("ordena e deduplica listas e remove os defaults da URL", () => {
    expect(parseCatalogSearch({ category: "music,gaming,music", sort: "recent", page: "1" })).toEqual({
      category: "gaming,music",
    });
  });

  it("degrada valor inválido ao default sem lançar", () => {
    expect(
      parseCatalogSearch({ category: "arte", chain: "solana,base", status: "x", sort: "barato", page: "-3", priceMin: "1,5" }),
    ).toEqual({ chain: "base" });
  });

  it("mantém preço exato e descarta a faixa invertida", () => {
    expect(parseCatalogSearch({ priceMin: "0.000000000000000001", page: "2" })).toEqual({
      priceMin: "0.000000000000000001",
      page: 2,
    });
    expect(parseCatalogSearch({ priceMin: "5", priceMax: "1" })).toEqual({});
  });

  it("apara a busca e ignora a vazia", () => {
    expect(parseCatalogSearch({ q: "  ape  " })).toEqual({ q: "ape" });
    expect(parseCatalogSearch({ q: "   " })).toEqual({});
  });
});

describe("pickCatalogSearch", () => {
  it("leva à API só os campos do catálogo, sem o estado do login", () => {
    const search = { q: "ape", page: 2, auth: "login", redirect: "/account/profile" };
    expect(pickCatalogSearch(search)).toEqual({ q: "ape", page: 2 });
  });
});
