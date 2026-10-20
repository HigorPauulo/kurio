import { describe, expect, it } from "vitest";
import { parsePlainSearch, stringifyPlainSearch } from "./search";

describe("busca da URL em texto puro", () => {
  it("mantém valor ETH com 18 casas e lista separada por vírgula sem passar por JSON", () => {
    const search = parsePlainSearch("?priceMin=0.123456789012345678&category=music,gaming&page=2");
    expect(search).toEqual({ priceMin: "0.123456789012345678", category: "music,gaming", page: "2" });
  });

  it("omite ausentes e vazios e escreve número sem aspas", () => {
    expect(stringifyPlainSearch({ q: "ape", page: 2, sort: undefined, status: "" })).toBe("?q=ape&page=2");
    expect(stringifyPlainSearch({})).toBe("");
  });

  it("ida e volta preservam o caminho de retorno do login", () => {
    const redirect = "/account/profile?tab=a&b=c";
    expect(parsePlainSearch(stringifyPlainSearch({ redirect }))).toEqual({ redirect });
  });
});
